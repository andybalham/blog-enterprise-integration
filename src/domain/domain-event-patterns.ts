import { EventType } from './domain-events';

export const QUOTE_PROCESSED_PATTERN = {
  detailType: [EventType.QuoteProcessed],
};

export const QUOTE_SUBMITTED_PATTERN = {
  detailType: [EventType.QuoteSubmitted],
};

export const CREDIT_REPORT_REQUESTED_PATTERN = {
  detailType: [EventType.CreditReportRequested],
};

export const CREDIT_REPORT_RECEIVED_PATTERN = {
  detailType: [EventType.CreditReportReceived],
};

export const QUOTE_PROCESSOR_CALLBACK_PATTERN = {
  detailType: [EventType.CreditReportReceived, EventType.LenderRateReceived],
};

export const LENDER_RATE_REQUESTED_PATTERN = {
  detailType: [EventType.LenderRateRequested],
};

export const getLenderRateRequestedPattern = (
  lenderId: string
): Record<string, any> => ({
  ...LENDER_RATE_REQUESTED_PATTERN,
  detail: {
    data: { request: { lenderId: [lenderId] } },
  },
});

export const LENDER_RATE_RECEIVED_PATTERN = {
  detailType: [EventType.LenderRateReceived],
};
