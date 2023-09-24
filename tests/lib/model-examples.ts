import {
  TEST_FIRST_NAME,
  TEST_LAST_NAME_FAILED,
  TEST_LAST_NAME_LOW_CREDIT_SCORE,
  TEST_LAST_NAME_MEDIUM_CREDIT_SCORE,
  TEST_LAST_NAME_HAS_BANKRUPTCIES,
  TEST_LAST_NAME_NOT_ON_ELECTORAL_ROLL,
} from '../../src/credit-bureau/constants';
import { QuoteRequest } from '../../src/domain/domain-models';

export const emptyLoanDetails = {
  amount: 0,
  termMonths: 0,
};

export const emptyPersonalDetails = {
  firstName: '',
  lastName: '',
  niNumber: '',
  address: {
    lines: [],
    postcode: '',
  },
};

export const emptyQuoteRequest: QuoteRequest = {
  loanDetails: emptyLoanDetails,
  personalDetails: emptyPersonalDetails,
};

export const defaultTestQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
  },
};

export const notOnElectoralRollQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
    lastName: TEST_LAST_NAME_NOT_ON_ELECTORAL_ROLL,
  },
};

export const hasBankruptciesQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
    lastName: TEST_LAST_NAME_HAS_BANKRUPTCIES,
  },
};

export const lowCreditScoreQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
    lastName: TEST_LAST_NAME_LOW_CREDIT_SCORE,
  },
};

export const mediumCreditScoreQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
    lastName: TEST_LAST_NAME_MEDIUM_CREDIT_SCORE,
  },
};

export const failedQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
  personalDetails: {
    ...emptyQuoteRequest.personalDetails,
    firstName: TEST_FIRST_NAME,
    lastName: TEST_LAST_NAME_FAILED,
  },
};
