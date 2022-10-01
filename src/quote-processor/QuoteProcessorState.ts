import { CreditReportReceived, QuoteSubmitted } from '../domain/domain-events';

export interface QuoteProcessorState {
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived?: CreditReportReceived;
  lenderIds?: string[];
}
