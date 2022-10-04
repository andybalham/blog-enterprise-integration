/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import { EventDetailType, QuoteProcessed } from '../domain/domain-events';
import { QuoteRequest } from '../domain/domain-models';
import { fetchFromUrlAsync, putDomainEventAsync } from '../lib/utils';
import { APPLICATION_EVENT_BUS_NAME } from './constants';
import { QuoteProcessorState } from './QuoteProcessorState';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (
  state: QuoteProcessorState
): Promise<QuoteProcessorState> => {
  console.log(JSON.stringify({ state }, null, 2));

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    state.quoteSubmitted.data.quoteRequestDataUrl
  );

  const quoteProcessed: QuoteProcessed = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      loanDetails: quoteRequest.loanDetails,
      quoteResponse: {
        rate: 10,
        lenderId: 'Honest Andy',
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
