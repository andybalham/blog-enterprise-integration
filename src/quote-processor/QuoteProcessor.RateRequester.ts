/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { randomInt } from 'crypto';
import {
  EventDetailType,
  EventDomain,
  EventService,
  RateRequested,
} from '../domain/domain-events';
import { QuoteResponse } from '../domain/domain-models';
import { putDomainEventAsync } from '../lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteRequestState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (event: QuoteRequestState): Promise<any> => {
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
      taskToken: 'TODO', // TODO 02Oct22: Need to raise the event with this
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.RateRequested,
    event: rateRequested,
  });

  // TODO 02Oct22: Complete asynchronously
  const quoteResponse: QuoteResponse = {
    lenderId: event.lender.lenderId,
    bestRate: randomInt(10),
  };

  return quoteResponse;
};
