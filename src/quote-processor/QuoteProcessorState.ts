import { CreditReportReceived, QuoteSubmitted } from '../domain/domain-events';
import { LenderRegisterEntry, QuoteResponse } from '../domain/domain-models';

export interface QuoteProcessorState {
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived?: CreditReportReceived;
  lenders?: LenderRegisterEntry[];
  quotes?: QuoteResponse[];
}

export interface QuoteRequestState {
  lender: LenderRegisterEntry;
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived: CreditReportReceived;
  taskToken: string;
}
