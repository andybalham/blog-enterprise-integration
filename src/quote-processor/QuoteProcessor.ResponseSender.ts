/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import { EventDetailType, QuoteProcessed } from 'src/domain/domain-events';
import { putDomainEventAsync } from 'src/lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteProcessorState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (
  state: QuoteProcessorState
): Promise<QuoteProcessorState> => {
  console.log(JSON.stringify({ state }, null, 2));

  const quoteProcessed: QuoteProcessed = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      quoteResponse: {
        bestRate: 10,
        lenderName: 'Honest Andy',
      },
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.QuoteProcessed,
    event: quoteProcessed,
  });

  return state;
};
