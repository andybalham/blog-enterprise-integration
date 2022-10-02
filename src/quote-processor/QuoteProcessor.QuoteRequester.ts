/* eslint-disable import/prefer-default-export */

import { QuoteResponse } from '../domain/domain-models';

/* eslint-disable no-console */
export const handler = async (event: Record<string, any>): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const quoteResponse: QuoteResponse = {
    lenderId: 'lender-id',
    bestRate: 4,
  };

  return quoteResponse;
};
