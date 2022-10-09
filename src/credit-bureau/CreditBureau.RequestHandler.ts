/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { EventBridgeEvent } from 'aws-lambda';
import crypto, { randomUUID } from 'crypto';
import {
  CreditReportReceived,
  CreditReportRequested,
  EventDetailType,
  EventDomain,
  EventService,
} from '../domain/domain-events';
import { CreditReport, QuoteRequest } from '../domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../lib/utils';
import {
  APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME,
  TEST_FIRST_NAME,
  TEST_HIGH_CREDIT_SCORE,
  TEST_LAST_NAME_FAILED,
  TEST_LAST_NAME_LOW_CREDIT_SCORE,
  TEST_LAST_NAME_MEDIUM_CREDIT_SCORE,
  TEST_LOW_CREDIT_SCORE,
  TEST_MEDIUM_CREDIT_SCORE,
  TEST_NI_NUMBER_HAS_BANKRUPTCIES,
  TEST_POSTCODE_NOT_ON_ELECTORAL_ROLL,
} from './constants';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];
const dataBucketName = process.env[DATA_BUCKET_NAME];

export const handler = async (
  event: EventBridgeEvent<'CreditReportRequested', CreditReportRequested>
): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    event.detail.data.request.quoteRequestDataUrl
  );

  console.log(JSON.stringify({ quoteRequest }, null, 2));

  const isTestRequest =
    quoteRequest.personalDetails.firstName === TEST_FIRST_NAME;

  if (isTestRequest) {
    await handleTestRequestAsync(quoteRequest, event.detail);
    return;
  }

  await handleRequestAsync(quoteRequest, event.detail);
};

async function handleRequestAsync(
  quoteRequest: QuoteRequest,
  creditReportRequested: CreditReportRequested
): Promise<void> {
  const personalDetailsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(quoteRequest.personalDetails))
    .digest('hex');

  const creditReport: CreditReport = {
    reportReference: randomUUID(),
    creditScore: getHashScore(personalDetailsHash, 0, 10, 1000),
    hasBankruptcies: getHashScore(personalDetailsHash, 10, 20, 100) > 80,
    onElectoralRoll: getHashScore(personalDetailsHash, 20, 30, 100) > 10,
  };

  const { quoteReference } = creditReportRequested.data.request;

  const creditReportDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}/${quoteReference}-credit-report.json`,
    data: JSON.stringify(creditReport),
  });

  const creditReportReceived = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
      correlationId: creditReportRequested.metadata.correlationId,
      requestId: creditReportRequested.metadata.requestId,
    },
    data: {
      resultType: 'SUCCEEDED',
      taskToken: creditReportRequested.data.taskToken,
      response: { creditReportDataUrl },
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportReceived,
    event: creditReportReceived,
  });
}

async function handleTestRequestAsync(
  quoteRequest: QuoteRequest,
  creditReportRequested: CreditReportRequested
): Promise<void> {
  const isFailedRequest =
    quoteRequest.personalDetails.lastName === TEST_LAST_NAME_FAILED;

  let creditReportReceived: CreditReportReceived;

  if (isFailedRequest) {
    creditReportReceived = {
      metadata: {
        domain: EventDomain.LoanBroker,
        service: EventService.CreditBureau,
        correlationId: creditReportRequested.metadata.correlationId,
        requestId: creditReportRequested.metadata.requestId,
      },
      data: {
        resultType: 'FAILED',
        taskToken: creditReportRequested.data.taskToken,
      },
    };
  } else {
    //
    let creditScore = TEST_HIGH_CREDIT_SCORE;
    if (
      quoteRequest.personalDetails.lastName === TEST_LAST_NAME_LOW_CREDIT_SCORE
    )
      creditScore = TEST_LOW_CREDIT_SCORE;
    if (
      quoteRequest.personalDetails.lastName ===
      TEST_LAST_NAME_MEDIUM_CREDIT_SCORE
    )
      creditScore = TEST_MEDIUM_CREDIT_SCORE;

    if (
      quoteRequest.personalDetails.lastName === TEST_LAST_NAME_LOW_CREDIT_SCORE
    )
      creditScore = TEST_LOW_CREDIT_SCORE;

    const creditReport: CreditReport = {
      reportReference: randomUUID(),
      creditScore,
      hasBankruptcies:
        quoteRequest.personalDetails.niNumber ===
        TEST_NI_NUMBER_HAS_BANKRUPTCIES,
      onElectoralRoll:
        quoteRequest.personalDetails.address.postcode !==
        TEST_POSTCODE_NOT_ON_ELECTORAL_ROLL,
    };

    const { quoteReference } = creditReportRequested.data.request;

    const creditReportDataUrl = await getDataUrlAsync({
      bucketName: dataBucketName,
      key: `${quoteReference}/${quoteReference}-credit-report.json`,
      data: JSON.stringify(creditReport),
    });

    creditReportReceived = {
      metadata: {
        domain: EventDomain.LoanBroker,
        service: EventService.CreditBureau,
        correlationId: creditReportRequested.metadata.correlationId,
        requestId: creditReportRequested.metadata.requestId,
      },
      data: {
        resultType: 'SUCCEEDED',
        taskToken: creditReportRequested.data.taskToken,
        response: { creditReportDataUrl },
      },
    };
  }

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportReceived,
    event: creditReportReceived,
  });
}

function getHashScore(
  hash: string,
  start: number,
  end: number,
  modulus: number
): number {
  const hashSlice = hash.slice(start, end);
  const hashScore = parseInt(hashSlice, 16) % modulus;
  return hashScore;
}
