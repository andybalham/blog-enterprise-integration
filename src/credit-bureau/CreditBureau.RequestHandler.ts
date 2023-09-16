/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda';
import crypto, { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as AWSXRay from 'aws-xray-sdk';
import {
  CreditReportReceivedV1,
  CreditReportRequestedV1,
  EventDomain,
  EventService,
  newCreditReportReceivedV1,
} from '../domain/domain-events';
import { CreditReport, QuoteRequest } from '../domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../lib/utils';
import {
  LOAN_BROKER_EVENT_BUS,
  CREDIT_BUREAU_DATA_BUCKET_NAME,
  TEST_FIRST_NAME,
  TEST_HIGH_CREDIT_SCORE,
  TEST_LAST_NAME_FAILED,
  TEST_LAST_NAME_LOW_CREDIT_SCORE,
  TEST_LAST_NAME_MEDIUM_CREDIT_SCORE,
  TEST_LOW_CREDIT_SCORE,
  TEST_MEDIUM_CREDIT_SCORE,
  TEST_LAST_NAME_HAS_BANKRUPTCIES,
  TEST_LAST_NAME_NOT_ON_ELECTORAL_ROLL,
} from './constants';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const dataBucketName = process.env[CREDIT_BUREAU_DATA_BUCKET_NAME];

const simulateExternalCallAsync = async (): Promise<void> => {
  const delayMillis = 1000 + randomInt(2000);
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
};

export const handler = async (
  event: EventBridgeEvent<'CreditReportRequested', CreditReportRequestedV1>
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

const EVENT_ORIGIN = {
  domain: EventDomain.LoanBroker,
  service: EventService.CreditBureau,
};

async function handleRequestAsync(
  quoteRequest: QuoteRequest,
  creditReportRequested: CreditReportRequestedV1
): Promise<void> {
  const personalDetailsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(quoteRequest.personalDetails))
    .digest('hex');

  const creditReport: CreditReport = {
    reportReference: uuidv4(),
    creditScore: getHashScore(personalDetailsHash, 0, 10, 1000),
    hasBankruptcies: getHashScore(personalDetailsHash, 10, 20, 100) > 80,
    onElectoralRoll: getHashScore(personalDetailsHash, 20, 30, 100) > 10,
  };

  console.log(
    JSON.stringify(
      { personalDetails: quoteRequest.personalDetails, creditReport },
      null,
      2
    )
  );

  const { quoteReference } = creditReportRequested.data.request;

  const creditReportDataUrl = await getCreditReportDataUrl(
    quoteReference,
    creditReport
  );

  const creditReportReceived = newCreditReportReceivedV1({
    origin: EVENT_ORIGIN,
    data: {
      resultType: 'SUCCEEDED',
      taskToken: creditReportRequested.data.taskToken,
      payload: { creditReportDataUrl },
    },
    context: creditReportRequested.metadata,
  });

  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('External Call');

  try {
    // Simple values that are indexed for filter expressions
    subsegment?.addAnnotation('callType', 'CreditBureau');
    // Related data for debugging purposes
    subsegment?.addMetadata('creditBureauDetails', {
      url: `https://credit-bureau.com`,
    });

    await simulateExternalCallAsync();
  } catch (error) {
    if (error instanceof Error) {
      subsegment?.addError(error);
    }
  } finally {
    subsegment?.close();
  }

  await putDomainEventAsync({
    eventBusName,
    domainEvent: creditReportReceived,
  });
}

async function handleTestRequestAsync(
  quoteRequest: QuoteRequest,
  creditReportRequested: CreditReportRequestedV1
): Promise<void> {
  const isFailedRequest =
    quoteRequest.personalDetails.lastName === TEST_LAST_NAME_FAILED;

  let creditReportReceived: CreditReportReceivedV1;

  if (isFailedRequest) {
    creditReportReceived = newCreditReportReceivedV1({
      origin: EVENT_ORIGIN,
      data: {
        resultType: 'FAILED',
        error: 'Test failure',
        taskToken: creditReportRequested.data.taskToken,
      },
      context: creditReportRequested.metadata,
    });
  } else {
    //
    let creditScore = TEST_HIGH_CREDIT_SCORE;
    if (
      quoteRequest.personalDetails.lastName.includes(
        TEST_LAST_NAME_LOW_CREDIT_SCORE
      )
    ) {
      creditScore = TEST_LOW_CREDIT_SCORE;
    } else if (
      quoteRequest.personalDetails.lastName.includes(
        TEST_LAST_NAME_MEDIUM_CREDIT_SCORE
      )
    ) {
      creditScore = TEST_MEDIUM_CREDIT_SCORE;
    }

    const creditReport: CreditReport = {
      reportReference: uuidv4(),
      creditScore,
      hasBankruptcies: quoteRequest.personalDetails.lastName.includes(
        TEST_LAST_NAME_HAS_BANKRUPTCIES
      ),
      onElectoralRoll: quoteRequest.personalDetails.lastName.includes(
        TEST_LAST_NAME_NOT_ON_ELECTORAL_ROLL
      ),
    };

    const { quoteReference } = creditReportRequested.data.request;

    const creditReportDataUrl = await getCreditReportDataUrl(
      quoteReference,
      creditReport
    );

    creditReportReceived = newCreditReportReceivedV1({
      origin: EVENT_ORIGIN,
      data: {
        resultType: 'SUCCEEDED',
        taskToken: creditReportRequested.data.taskToken,
        payload: { creditReportDataUrl },
      },
      context: creditReportRequested.metadata,
    });
  }

  await putDomainEventAsync({
    eventBusName,
    domainEvent: creditReportReceived,
  });
}

async function getCreditReportDataUrl(
  quoteReference: string,
  creditReport: CreditReport
): Promise<string> {
  return getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}-credit-report.json`,
    data: JSON.stringify(creditReport),
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
