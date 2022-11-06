import {
  CreditReportReceivedV1,
  LenderRateReceivedV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';
import { LenderRate, LenderRegisterEntry } from '../domain/domain-models';

export interface LoanBrokerState {
  quoteSubmitted: QuoteSubmittedV1;
  creditReportReceived?: CreditReportReceivedV1;
  lenders?: LenderRegisterEntry[];
  lenderRatesReceived?: LenderRateReceivedV1[];
  bestLenderRate?: LenderRate;
}

export interface QuoteRequestState {
  lender: LenderRegisterEntry;
  quoteSubmitted: QuoteSubmittedV1;
  creditReportReceived: CreditReportReceivedV1;
  taskToken: string;
}
