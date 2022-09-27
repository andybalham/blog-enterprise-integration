/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { EventDetailType } from '../../src/domain/domain-events';
import { QuoteRequest } from '../../src/domain/domain-models';
import { putDomainEventAsync } from '../../src/lib/utils';
import { defaultTestQuoteRequest } from '../lib/model-examples';
import { getQuoteSubmittedEvent } from '../lib/utils';
import QuoteProcessorTestStack from './QuoteProcessorTestStack';

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
    await testClient.initialiseTestAsync();

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

    // Act

    await putDomainEventAsync({
      eventBusName: applicationEventBus.eventBusArn,
      detailType: EventDetailType.QuoteSubmitted,
      event: quoteSubmitted,
    });

    // TODO 27Sep22: We need to respond to the credit report request

    // Await

    const { observations: quoteProcessedObservations, timedOut } =
      await testClient.pollTestAsync({
        filterById: QuoteProcessorTestStack.QuoteProcessedObserverId,
        until: async (o) => o.length > 0,
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

    expect(observationData.detail.data.quoteReference).toBe(
      quoteSubmitted.data.quoteReference
    );

    expect(observationData.detail.data.loanDetails).toEqual(
      quoteRequest.loanDetails
    );
  });

  test(`Quote submitted event results in credit report requested event`, async () => {
    // Arrange

    const quoteSubmitted = await getQuoteSubmittedEvent(
      dataBucket,
      defaultTestQuoteRequest
    );

    // Act

    await putDomainEventAsync({
      eventBusName: applicationEventBus.eventBusArn,
      detailType: EventDetailType.QuoteSubmitted,
      event: quoteSubmitted,
    });

    // Await

    const { observations: creditReportRequestedObservations, timedOut } =
      await testClient.pollTestAsync({
        filterById: QuoteProcessorTestStack.CreditReportRequestedObserverId,
        until: async (o) => o.length > 0,
      });

    // Assert

    expect(timedOut).toBeFalsy();

    const observationData = creditReportRequestedObservations[0].data;

    expect(observationData['detail-type']).toBe(
      EventDetailType.CreditReportRequested
    );

    // TODO 25Sep22: Assert
  });
});
