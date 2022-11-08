/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { EventBridgeEvent } from 'aws-lambda';
import {
  TEST_HIGH_CREDIT_SCORE,
  TEST_LOW_CREDIT_SCORE,
  TEST_MEDIUM_CREDIT_SCORE,
} from '../../src/credit-bureau/constants';
import {
  CreditReportReceivedV1,
  EventType,
  EventDomain,
  EventService,
  newCreditReportRequestedV1,
} from '../../src/domain/domain-events';
import { CreditReport, QuoteRequest } from '../../src/domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../../src/lib/utils';
import {
  defaultTestQuoteRequest,
  failedQuoteRequest,
  hasBankruptciesQuoteRequest,
  lowCreditScoreQuoteRequest,
  mediumCreditScoreQuoteRequest,
  notOnElectoralRollQuoteRequest,
} from '../lib/model-examples';
import CreditBureauTestStack from './CreditBureauTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('CreditBureau tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: CreditBureauTestStack.Id,
  });

  let dataBucket: S3TestClient;
  let loanBrokerEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(CreditBureauTestStack.DataBucketId);

    loanBrokerEventBus = testClient.getEventBridgeTestClient(
      CreditBureauTestStack.LoanBrokerEventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await dataBucket.clearAllObjectsAsync();
  });

  [
    {
      quoteRequest: defaultTestQuoteRequest,
      expectedResultType: 'SUCCEEDED',
      expectedOnElectoralRoll: true,
      expectedHasBankruptcies: false,
      expectedCreditScore: TEST_HIGH_CREDIT_SCORE,
    },
    {
      quoteRequest: notOnElectoralRollQuoteRequest,
      expectedResultType: 'SUCCEEDED',
      expectedOnElectoralRoll: false,
      expectedHasBankruptcies: false,
      expectedCreditScore: TEST_HIGH_CREDIT_SCORE,
    },
    {
      quoteRequest: hasBankruptciesQuoteRequest,
      expectedResultType: 'SUCCEEDED',
      expectedOnElectoralRoll: true,
      expectedHasBankruptcies: true,
      expectedCreditScore: TEST_HIGH_CREDIT_SCORE,
    },
    {
      quoteRequest: lowCreditScoreQuoteRequest,
      expectedResultType: 'SUCCEEDED',
      expectedOnElectoralRoll: true,
      expectedHasBankruptcies: false,
      expectedCreditScore: TEST_LOW_CREDIT_SCORE,
    },
    {
      quoteRequest: mediumCreditScoreQuoteRequest,
      expectedResultType: 'SUCCEEDED',
      expectedOnElectoralRoll: true,
      expectedHasBankruptcies: false,
      expectedCreditScore: TEST_MEDIUM_CREDIT_SCORE,
    },
    {
      quoteRequest: failedQuoteRequest,
      expectedResultType: 'FAILED',
    },
  ].forEach((theory) => {
    test(`Test response: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const quoteRequestDataUrl = await getDataUrlAsync({
        bucketName: dataBucket.bucketName,
        key: 'test-quote-request',
        data: JSON.stringify(theory.quoteRequest),
        expirySeconds: 5 * 60,
      });

      const creditReportRequested = newCreditReportRequestedV1({
        context: {
          correlationId: 'test-correlationId',
          requestId: 'test-requestId',
        },
        origin: {
          domain: EventDomain.LoanBroker,
          service: EventService.LoanBroker,
        },
        data: {
          request: {
            quoteReference: 'test-quote-reference',
            quoteRequestDataUrl,
          },
          taskToken: 'test-task-token',
        },
      });

      // Act

      await putDomainEventAsync({
        eventBusName: loanBrokerEventBus.eventBusArn,
        domainEvent: creditReportRequested,
      });

      // Await

      const { timedOut, observations } = await testClient.pollTestAsync({
        until: async (o) => o.length > 0,
      });

      // Assert

      expect(timedOut).toBeFalsy();

      const firstEvent = observations[0].data as EventBridgeEvent<
        'CreditReportReceived',
        CreditReportReceivedV1
      >;

      expect(firstEvent['detail-type']).toBe(EventType.CreditReportReceived);

      expect(firstEvent.detail.metadata.correlationId).toBe(
        creditReportRequested.metadata.correlationId
      );

      expect(firstEvent.detail.metadata.requestId).toBe(
        creditReportRequested.metadata.requestId
      );

      expect(firstEvent.detail.data.taskToken).toBe(
        creditReportRequested.data.taskToken
      );

      expect(firstEvent.detail.data.resultType).toBe(theory.expectedResultType);

      if (firstEvent.detail.data.resultType === 'SUCCEEDED') {
        //
        expect(
          firstEvent.detail.data.payload.creditReportDataUrl
        ).toBeDefined();

        const actualCreditReport = await fetchFromUrlAsync<CreditReport>(
          firstEvent.detail.data.payload.creditReportDataUrl
        );

        expect(actualCreditReport.reportReference).toBeDefined();

        expect(actualCreditReport.hasBankruptcies).toBe(
          theory.expectedHasBankruptcies
        );

        expect(actualCreditReport.onElectoralRoll).toBe(
          theory.expectedOnElectoralRoll
        );

        expect(actualCreditReport.creditScore).toBe(theory.expectedCreditScore);
        //
      } else {
        expect(firstEvent.detail.data.resultType).toBe(
          theory.expectedResultType
        );
        expect(firstEvent.detail.data.error).toBeDefined();
      }
    });
  });

  test(`Hash response`, async () => {
    // Arrange

    const quoteRequest: QuoteRequest = {
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
      personalDetails: {
        firstName: 'Trevor',
        lastName: 'Potato',
        niNumber: 'YE342564T',
        address: {
          lines: ['Line1'],
          postcode: 'HR8 35F',
        },
      },
    };

    const quoteRequestDataUrl = await getDataUrlAsync({
      bucketName: dataBucket.bucketName,
      key: 'test-quote-request',
      data: JSON.stringify(quoteRequest),
      expirySeconds: 5 * 60,
    });

    const creditReportRequested = newCreditReportRequestedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LoanBroker,
      },
      data: {
        request: {
          quoteReference: 'test-quote-reference',
          quoteRequestDataUrl,
        },
        taskToken: 'test-task-token',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent: creditReportRequested,
    });

    // Await

    const { timedOut, observations } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    const firstEvent = observations[0].data as EventBridgeEvent<
      'CreditReportReceived',
      CreditReportReceivedV1
    >;

    expect(firstEvent['detail-type']).toBe(EventType.CreditReportReceived);

    expect(firstEvent.detail.metadata.correlationId).toBe(
      creditReportRequested.metadata.correlationId
    );

    expect(firstEvent.detail.metadata.requestId).toBe(
      creditReportRequested.metadata.requestId
    );

    expect(firstEvent.detail.data.taskToken).toBe(
      creditReportRequested.data.taskToken
    );

    expect(firstEvent.detail.data.resultType).toBe('SUCCEEDED');

    if (firstEvent.detail.data.resultType === 'SUCCEEDED') {
      expect(firstEvent.detail.data.payload).toBeDefined();
    }
  });
});
