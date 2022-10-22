/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import {
  EventDetailType,
  QuoteProcessed,
} from '../../src/domain/domain-events';
import { CreditReport, QuoteRequest } from '../../src/domain/domain-models';
import { putDomainEventAsync } from '../../src/lib/utils';
import { defaultTestQuoteRequest } from '../lib/model-examples';
import { getQuoteSubmittedEvent } from '../lib/utils';
import LoanBrokerTestStack from './LoanBrokerTestStack';
import { MockLenderResponse } from './LoanBrokerTestStack.MockLender';

jest.setTimeout(2 * 60 * 1000);

describe('LoanBroker Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: LoanBrokerTestStack.Id,
  });

  let dataBucket: S3TestClient;
  let loanBrokerEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(LoanBrokerTestStack.DataBucketId);

    loanBrokerEventBus = testClient.getEventBridgeTestClient(
      LoanBrokerTestStack.LoanBrokerEventBusId
    );
  });

  beforeEach(async () => {
    await dataBucket.clearAllObjectsAsync();
  });

  test(`Quote submitted event results in quote processed event`, async () => {
    // Arrange

    const quoteRequest: QuoteRequest = {
      ...defaultTestQuoteRequest,
      loanDetails: {
        amount: 1000,
        termMonths: 12,
      },
    };

    const quoteSubmitted = await getQuoteSubmittedEvent(
      dataBucket,
      quoteRequest
    );

    const creditReport: CreditReport = {
      reportReference: 'test-report-reference',
      creditScore: 999,
      hasBankruptcies: false,
      onElectoralRoll: true,
    };

    const lenderResponses: Record<string, MockLenderResponse> = {
      [LoanBrokerTestStack.LENDER_1_ID]: {
        resultType: 'SUCCEEDED',
        lenderRate: {
          lenderId: LoanBrokerTestStack.LENDER_1_ID,
          lenderName: 'Lender One',
          rate: 3,
        },
      },
      [LoanBrokerTestStack.LENDER_2_ID]: {
        resultType: 'SUCCEEDED',
        lenderRate: {
          lenderId: LoanBrokerTestStack.LENDER_2_ID,
          lenderName: 'Lender Two',
          rate: 2,
        },
      },
    };

    await testClient.initialiseTestAsync({
      testId: 'quote-processed-event-published',
      inputs: {
        creditReportResultType: 'SUCCEEDED',
        creditReport,
        lenderResponses,
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      detailType: EventDetailType.QuoteSubmitted,
      event: quoteSubmitted,
    });

    // Await

    const { observations: quoteProcessedObservations, timedOut } =
      await testClient.pollTestAsync({
        filterById: LoanBrokerTestStack.QuoteProcessedObserverId,
        until: async (o) => o.length > 0,
        timeoutSeconds: 30,
      });

    // Assert

    expect(timedOut).toBeFalsy();

    const observationData = quoteProcessedObservations[0].data;

    expect(observationData['detail-type']).toBe(EventDetailType.QuoteProcessed);

    expect(observationData.detail.metadata.correlationId).toBe(
      quoteSubmitted.metadata.correlationId
    );

    expect(observationData.detail.metadata.requestId).toBe(
      quoteSubmitted.metadata.requestId
    );

    const quoteProcessed = observationData.detail as QuoteProcessed;

    expect(quoteProcessed.data.quoteReference).toBe(
      quoteSubmitted.data.quoteReference
    );

    expect(quoteProcessed.data.loanDetails).toEqual(quoteRequest.loanDetails);

    expect(quoteProcessed.data.bestLenderRate).toEqual(
      lenderResponses[LoanBrokerTestStack.LENDER_2_ID].lenderRate
    );
  });
});
