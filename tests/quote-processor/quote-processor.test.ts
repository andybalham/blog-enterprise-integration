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

  test(`Submitted event results in processed event`, async () => {
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

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    expect(observations[0].data['detail-type']).toBe(
      EventDetailType.QuoteProcessed
    );

    expect(observations[0].data.detail.metadata.correlationId).toBe(
      quoteSubmitted.metadata.correlationId
    );

    expect(observations[0].data.detail.metadata.requestId).toBe(
      quoteSubmitted.metadata.requestId
    );

    expect(observations[0].data.detail.data.quoteReference).toBe(
      quoteSubmitted.data.quoteReference
    );

    expect(observations[0].data.detail.data.loanDetails).toEqual(
      quoteRequest.loanDetails
    );
  });

  test(`TODO`, async () => {});
});
