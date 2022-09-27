/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { EventBridgeEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
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
    event.detail.data.quoteRequestDataUrl
  );

  const isTestRequest =
    quoteRequest.personalDetails.firstName === TEST_FIRST_NAME;

  if (isTestRequest) {
    console.log(JSON.stringify({ quoteRequest }, null, 2));

    const isFailedRequest =
      quoteRequest.personalDetails.lastName === TEST_LAST_NAME_FAILED;

    let creditReportReceived: CreditReportReceived;

    if (isFailedRequest) {
      creditReportReceived = {
        metadata: {
          domain: EventDomain.LoanBroker,
          service: EventService.CreditBureau,
          correlationId: event.detail.metadata.correlationId,
          requestId: event.detail.metadata.requestId,
        },
        data: {
          resultType: 'FAILED',
          taskToken: event.detail.data.taskToken,
        },
      };
    } else {
      //
      let creditScore = TEST_HIGH_CREDIT_SCORE;
      if (
        quoteRequest.personalDetails.lastName ===
        TEST_LAST_NAME_LOW_CREDIT_SCORE
      )
        creditScore = TEST_LOW_CREDIT_SCORE;
      if (
        quoteRequest.personalDetails.lastName ===
        TEST_LAST_NAME_MEDIUM_CREDIT_SCORE
      )
        creditScore = TEST_MEDIUM_CREDIT_SCORE;

      if (
        quoteRequest.personalDetails.lastName ===
        TEST_LAST_NAME_LOW_CREDIT_SCORE
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

      const creditReportDataUrl = await getDataUrlAsync({
        bucketName: dataBucketName,
        key: `${event.detail.data.quoteReference}/${event.detail.data.quoteReference}-credit-report.json`,
        data: JSON.stringify(creditReport),
      });

      creditReportReceived = {
        metadata: {
          domain: EventDomain.LoanBroker,
          service: EventService.CreditBureau,
          correlationId: event.detail.metadata.correlationId,
          requestId: event.detail.metadata.requestId,
        },
        data: {
          resultType: 'SUCCEEDED',
          taskToken: event.detail.data.taskToken,
          creditReportDataUrl,
        },
      };
    }

    await putDomainEventAsync({
      eventBusName,
      detailType: EventDetailType.CreditReportReceived,
      event: creditReportReceived,
    });
  }
};
