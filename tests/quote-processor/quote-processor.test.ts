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
import QuoteProcessorTestStack from './QuoteProcessorTestStack';
import { MockLenderResponse } from './QuoteProcessorTestStack.MockLender';

jest.setTimeout(2 * 60 * 1000);

describe('QuoteProcessor Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: QuoteProcessorTestStack.Id,
  });

  let dataBucket: S3TestClient;
  let applicationEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(
      QuoteProcessorTestStack.DataBucketId
    );

    applicationEventBus = testClient.getEventBridgeTestClient(
      QuoteProcessorTestStack.ApplicationEventBusId
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
      [QuoteProcessorTestStack.LENDER_1_ID]: {
        resultType: 'SUCCEEDED',
        lenderQuote: {
          lenderId: QuoteProcessorTestStack.LENDER_1_ID,
          lenderName: 'Lender One',
          rate: 3,
        },
      },
      [QuoteProcessorTestStack.LENDER_2_ID]: {
        resultType: 'SUCCEEDED',
        lenderQuote: {
          lenderId: QuoteProcessorTestStack.LENDER_2_ID,
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
      eventBusName: applicationEventBus.eventBusArn,
      detailType: EventDetailType.QuoteSubmitted,
      event: quoteSubmitted,
    });

    // Await

    const { observations: quoteProcessedObservations, timedOut } =
      await testClient.pollTestAsync({
        filterById: QuoteProcessorTestStack.QuoteProcessedObserverId,
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

    expect(quoteProcessed.data.bestLenderQuote).toEqual(
      lenderResponses[QuoteProcessorTestStack.LENDER_2_ID].lenderQuote
    );
  });
});
