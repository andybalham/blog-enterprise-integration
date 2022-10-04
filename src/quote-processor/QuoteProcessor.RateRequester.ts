/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { randomInt } from 'crypto';
import {
  EventDetailType,
  EventDomain,
  EventService,
  RateRequested,
} from '../domain/domain-events';
import { putDomainEventAsync } from '../lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteRequestState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (event: QuoteRequestState): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const rateRequested: RateRequested = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.QuoteProcessor,
      correlationId: event.quoteSubmitted.metadata.correlationId,
      requestId: event.quoteSubmitted.metadata.requestId,
    },
    data: {
      lenderId: event.lender.lenderId,
      quoteReference: event.quoteSubmitted.data.quoteReference,
      quoteRequestDataUrl: event.quoteSubmitted.data.quoteRequestDataUrl,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      creditReportDataUrl: event.creditReportReceived.data.creditReportDataUrl!,
      taskToken: event.taskToken,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.RateRequested,
    event: rateRequested,
  });
};
