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

export const QUOTE_PROCESSOR_CALLBACK_PATTERN = {
  detailType: [
    EventDetailType.CreditReportReceived,
    EventDetailType.RateReceived,
  ],
};

export const RATE_REQUESTED_PATTERN = {
  detailType: [EventDetailType.RateRequested],
};

export const getLenderRateRequestedPattern = (
  lenderId: string
): Record<string, any> => ({
  ...RATE_REQUESTED_PATTERN,
  detail: {
    data: { lenderId: [lenderId] },
  },
});

export const RATE_RECEIVED_PATTERN = {
  detailType: [EventDetailType.RateReceived],
};
