/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import { EventDetailType, QuoteProcessed } from '../domain/domain-events';
import { LenderQuote, QuoteRequest } from '../domain/domain-models';
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

  const lenderQuotePromises =
    state.lenderRatesReceived
      ?.filter((lrr) => lrr.data.response?.rateDataUrl)
      .map(async (lrr) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        fetchFromUrlAsync<LenderQuote>(lrr.data.response!.rateDataUrl!)
      ) ?? [];

  const lenderQuotePromiseResults = await Promise.allSettled(
    lenderQuotePromises
  );

  const lenderQuotes = (
    lenderQuotePromiseResults.filter(
      (r) => r.status === 'fulfilled'
    ) as PromiseFulfilledResult<LenderQuote>[]
  ).map((r) => r.value);

  console.log(JSON.stringify({ lenderQuotes }, null, 2));

  const bestLenderQuote = lenderQuotes.reduce((lq1, lq2) =>
    lq1.rate < lq2.rate ? lq1 : lq2
  );

  const quoteProcessed: QuoteProcessed = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      loanDetails: quoteRequest.loanDetails,
      bestLenderQuote,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.QuoteProcessed,
    event: quoteProcessed,
  });

  return state;
};
