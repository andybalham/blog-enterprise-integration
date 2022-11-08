import {
  CreditReportReceivedDataV1,
  LenderRateReceivedDataV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';
import { LenderRate, LenderRegisterEntry } from '../domain/domain-models';

export interface LoanBrokerState {
  quoteSubmitted: QuoteSubmittedV1;
  creditReportReceivedData?: CreditReportReceivedDataV1;
  lenders?: LenderRegisterEntry[];
  lenderRatesReceivedData?: LenderRateReceivedDataV1[];
  bestLenderRate?: LenderRate;
}

export interface QuoteRequestState {
  lender: LenderRegisterEntry;
  quoteSubmitted: QuoteSubmittedV1;
  creditReportReceivedData: CreditReportReceivedDataV1;
  taskToken: string;
}
