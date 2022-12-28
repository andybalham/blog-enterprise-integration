import { IntegrationTestClient } from '@andybalham/cdk-cloud-test-kit';
import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import {
  CREDIT_REPORT_RECEIVED_PATTERN_V1,
  CREDIT_REPORT_REQUESTED_PATTERN_V1,
  getLenderRateRequestedV1Pattern,
  LENDER_RATE_RECEIVED_PATTERN_V1,
  LENDER_RATE_REQUESTED_PATTERN_V1,
  LOAN_BROKER_CALLBACK_PATTERN_V1,
  LOAN_BROKER_DOMAIN_PATTERN,
  QUOTE_PROCESSED_PATTERN_V1,
  QUOTE_SUBMITTED_PATTERN_V1,
} from '../../src/domain/domain-event-patterns';
import {
  EventDomain,
  EventService,
  newCreditReportReceivedV1,
  newCreditReportRequestedV1,
  newLenderRateReceivedV1,
  newLenderRateRequestedV1,
  newQuoteProcessedV1,
  newQuoteSubmittedV1,
} from '../../src/domain/domain-events';
import { emptyLoanDetails } from '../lib/model-examples';

const TEST_ORIGIN = {
  domain: EventDomain.LoanBroker,
  service: EventService.LoanBroker,
};

describe('Domain Event Pattern Test Suite', () => {
  //
  [
    {
      isMatchExpected: true,
      eventPattern: LOAN_BROKER_DOMAIN_PATTERN,
      domainEvent: newQuoteSubmittedV1({
        origin: TEST_ORIGIN,
        data: {
          quoteReference: 'test-quoteReference',
          quoteRequestDataUrl: 'test-quoteRequestDataUrl',
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: QUOTE_SUBMITTED_PATTERN_V1,
      domainEvent: newQuoteSubmittedV1({
        origin: TEST_ORIGIN,
        data: {
          quoteReference: 'test-quoteReference',
          quoteRequestDataUrl: 'test-quoteRequestDataUrl',
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: QUOTE_PROCESSED_PATTERN_V1,
      domainEvent: newQuoteProcessedV1({
        origin: TEST_ORIGIN,
        data: {
          quoteReference: 'test-quoteReference',
          loanDetails: emptyLoanDetails,
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: CREDIT_REPORT_REQUESTED_PATTERN_V1,
      domainEvent: newCreditReportRequestedV1({
        origin: TEST_ORIGIN,
        data: {
          request: {
            quoteReference: 'test-quoteReference',
            quoteRequestDataUrl: 'test-quoteRequestDataUrl',
          },
          taskToken: 'test-taskToken',
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: CREDIT_REPORT_RECEIVED_PATTERN_V1,
      domainEvent: newCreditReportReceivedV1({
        origin: TEST_ORIGIN,
        data: {
          resultType: 'SUCCEEDED',
          taskToken: 'test-taskToken',
          payload: {
            creditReportDataUrl: 'test-creditReportDataUrl',
          },
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: LOAN_BROKER_CALLBACK_PATTERN_V1,
      domainEvent: newCreditReportReceivedV1({
        origin: TEST_ORIGIN,
        data: {
          resultType: 'SUCCEEDED',
          taskToken: 'test-taskToken',
          payload: {
            creditReportDataUrl: 'test-creditReportDataUrl',
          },
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: LOAN_BROKER_CALLBACK_PATTERN_V1,
      domainEvent: newLenderRateReceivedV1({
        origin: TEST_ORIGIN,
        data: {
          resultType: 'SUCCEEDED',
          taskToken: 'test-taskToken',
          payload: {
            lenderId: 'test-lenderId',
            isRateAvailable: true,
            lenderRateDataUrl: 'test-lenderRateDataUrl',
          },
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: LENDER_RATE_REQUESTED_PATTERN_V1,
      domainEvent: newLenderRateRequestedV1({
        origin: TEST_ORIGIN,
        data: {
          request: {
            quoteReference: 'test-quoteReference',
            lenderId: 'test-lenderId',
            quoteRequestDataUrl: 'test-quoteRequestDataUrl',
            creditReportDataUrl: 'test-creditReportDataUrl',
          },
          taskToken: 'test-taskToken',
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: LENDER_RATE_RECEIVED_PATTERN_V1,
      domainEvent: newLenderRateReceivedV1({
        origin: TEST_ORIGIN,
        data: {
          resultType: 'SUCCEEDED',
          taskToken: 'test-taskToken',
          payload: {
            lenderId: 'test-lenderId',
            isRateAvailable: true,
            lenderRateDataUrl: 'test-lenderRateDataUrl',
          },
        },
      }),
    },
    {
      isMatchExpected: true,
      eventPattern: getLenderRateRequestedV1Pattern('test-lenderId'),
      domainEvent: newLenderRateRequestedV1({
        origin: TEST_ORIGIN,
        data: {
          request: {
            quoteReference: 'test-quoteReference',
            lenderId: 'test-lenderId',
            quoteRequestDataUrl: 'test-quoteRequestDataUrl',
            creditReportDataUrl: 'test-creditReportDataUrl',
          },
          taskToken: 'test-taskToken',
        },
      }),
    },
    {
      isMatchExpected: false,
      eventPattern: getLenderRateRequestedV1Pattern('unknown-lenderId'),
      domainEvent: newLenderRateRequestedV1({
        origin: TEST_ORIGIN,
        data: {
          request: {
            quoteReference: 'test-quoteReference',
            lenderId: 'test-lenderId',
            quoteRequestDataUrl: 'test-quoteRequestDataUrl',
            creditReportDataUrl: 'test-creditReportDataUrl',
          },
          taskToken: 'test-taskToken',
        },
      }),
    },
  ].forEach((theory) => {
    it(`Tests pattern: ${JSON.stringify({
      isMatchExpected: theory.isMatchExpected,
      eventPattern: theory.eventPattern,
    })}`, async () => {
      // Arrange

      const putEventsRequest: PutEventsRequestEntry = {
        Source: `test-event-pattern`,
        DetailType: theory.domainEvent.metadata.eventType,
        Detail: JSON.stringify(theory.domainEvent),
      };

      // Act

      const isMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: theory.eventPattern,
        putEventsRequest,
      });

      expect(isMatch).toBe(theory.isMatchExpected);
    });
  });
});
