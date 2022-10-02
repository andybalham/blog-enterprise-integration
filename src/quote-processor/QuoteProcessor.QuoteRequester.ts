/* eslint-disable import/prefer-default-export */
import { randomInt } from 'crypto';
import { QuoteResponse } from '../domain/domain-models';
import { QuoteRequestState } from './QuoteProcessorState';

/* eslint-disable no-console */
export const handler = async (event: QuoteRequestState): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const quoteResponse: QuoteResponse = {
    lenderId: event.lender.lenderId,
    bestRate: randomInt(10),
  };

  return quoteResponse;
};
