/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import {
  EventDetailType,
  CreditReportRequested,
} from '../domain/domain-events';
import { putDomainEventAsync } from '../lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteProcessorState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (event: Record<string, any>): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const state = event.state as QuoteProcessorState;

  // TODO 25Sep22: We need to pass the task token to and from the credit bureau

  const creditReportRequested: CreditReportRequested = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      quoteRequestDataUrl: state.quoteSubmitted.data.quoteRequestDataUrl,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportRequested,
    event: creditReportRequested,
  });
};
