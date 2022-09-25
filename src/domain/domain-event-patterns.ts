import { EventDetailType } from './domain-events';

export const QUOTE_PROCESSED_PATTERN = {
  detailType: [EventDetailType.QuoteProcessed],
};

export const QUOTE_SUBMITTED_PATTERN = {
  detailType: [EventDetailType.QuoteSubmitted],
};

export const CREDIT_REPORT_REQUESTED_PATTERN = {
  detailType: [EventDetailType.CreditReportRequested],
};

export const CREDIT_REPORT_RECEIVED_PATTERN = {
  detailType: [EventDetailType.CreditReportReceived],
};
