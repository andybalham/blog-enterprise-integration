import { EventDomain, EventType } from './domain-events';

export const LOAN_BROKER_DOMAIN_PATTERN = {
  detail: {
    metadata: {
      domain: [EventDomain.LoanBroker],
    },
  },
};

export const QUOTE_SUBMITTED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.QuoteSubmitted],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const QUOTE_PROCESSED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.QuoteProcessed],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const CREDIT_REPORT_REQUESTED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.CreditReportRequested],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const CREDIT_REPORT_RECEIVED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.CreditReportReceived],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const CREDIT_REPORT_FAILED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.CreditReportFailed],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const LOAN_BROKER_CALLBACK_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.CreditReportReceived, EventType.LenderRateReceived],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const LENDER_RATE_REQUESTED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.LenderRateRequested],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};

export const getLenderRateRequestedV1Pattern = (
  lenderId: string
): Record<string, any> => ({
  detail: {
    metadata: {
      eventType: [EventType.LenderRateRequested],
      eventVersion: [{ prefix: '1.' }],
    },
    data: { request: { lenderId: [lenderId] } },
  },
});

export const LENDER_RATE_RECEIVED_PATTERN_V1 = {
  detail: {
    metadata: {
      eventType: [EventType.LenderRateReceived],
      eventVersion: [{ prefix: '1.' }],
    },
  },
};
