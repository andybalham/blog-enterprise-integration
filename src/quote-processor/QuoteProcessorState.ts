import {
  CreditReportReceived,
  LenderRateReceived,
  QuoteSubmitted,
} from '../domain/domain-events';
import { LenderRegisterEntry } from '../domain/domain-models';

export interface QuoteProcessorState {
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived?: CreditReportReceived;
  lenders?: LenderRegisterEntry[];
  lenderRatesReceived?: LenderRateReceived[];
}

export interface QuoteRequestState {
  lender: LenderRegisterEntry;
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived: CreditReportReceived;
  taskToken: string;
}
