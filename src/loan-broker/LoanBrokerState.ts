import {
  CreditReportReceived,
  LenderRateReceived,
  QuoteSubmitted,
} from '../domain/domain-events';
import { LenderRate, LenderRegisterEntry } from '../domain/domain-models';

export interface LoanBrokerState {
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived?: CreditReportReceived;
  lenders?: LenderRegisterEntry[];
  lenderRatesReceived?: LenderRateReceived[];
  bestLenderRate?: LenderRate;
}

export interface QuoteRequestState {
  lender: LenderRegisterEntry;
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived: CreditReportReceived;
  taskToken: string;
}
