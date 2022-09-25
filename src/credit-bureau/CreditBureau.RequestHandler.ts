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
  HIGH_CREDIT_SCORE,
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

  console.log(JSON.stringify({ quoteRequest }, null, 2));

  const creditReport: CreditReport = {
    reportReference: randomUUID(),
    creditScore: HIGH_CREDIT_SCORE,
    hasBankruptcies: false,
    onElectoralRoll: true,
  };

  const creditReportDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${event.detail.data.quoteReference}/${event.detail.data.quoteReference}-credit-report.json`,
    data: JSON.stringify(creditReport),
  });

  const creditReportReceived: CreditReportReceived = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
      correlationId: event.detail.metadata.correlationId,
      requestId: randomUUID(),
    },
    data: {
      resultType: 'SUCCEEDED',
      creditReportDataUrl,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportReceived,
    event: creditReportReceived,
  });
};
