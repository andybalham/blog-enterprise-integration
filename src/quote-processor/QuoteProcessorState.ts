import { CreditReportReceived, QuoteSubmitted } from '../domain/domain-events';
import { Lender } from '../domain/domain-models';

export interface QuoteProcessorState {
  quoteSubmitted: QuoteSubmitted;
  creditReportReceived?: CreditReportReceived;
  lenders?: Lender[];
}
