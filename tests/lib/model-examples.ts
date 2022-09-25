/* eslint-disable import/prefer-default-export */
import { QuoteRequest } from '../../src/domain/domain-models';

export const emptyQuoteRequest: QuoteRequest = {
  loanDetails: {
    amount: 0,
    termMonths: 0,
  },
  personalDetails: {
    firstName: '',
    lastName: '',
    niNumber: '',
    address: {
      lines: [],
      postcode: '',
    },
  },
};
