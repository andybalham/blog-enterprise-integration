/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import {
  EventDetailType,
  EventDomain,
  EventService,
  LenderRateRequested,
} from '../domain/domain-events';
import { putDomainEventAsync } from '../lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteRequestState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (event: QuoteRequestState): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  // TODO 06Oct22: Assert creditReportDataUrl is not null?

  const lenderRateRequested: LenderRateRequested = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.QuoteProcessor,
      correlationId: event.quoteSubmitted.metadata.correlationId,
      requestId: event.quoteSubmitted.metadata.requestId,
    },
    data: {
      request: {
        lenderId: event.lender.lenderId,
        quoteReference: event.quoteSubmitted.data.quoteReference,
        quoteRequestDataUrl: event.quoteSubmitted.data.quoteRequestDataUrl,
        creditReportDataUrl:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          event.creditReportReceived.data.response!.creditReportDataUrl!,
      },
      taskToken: event.taskToken,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.RateRequested,
    event: lenderRateRequested,
  });
};
