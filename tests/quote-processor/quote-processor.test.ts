/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { QuoteRequest } from 'src/domain/domain-models';
import {
  QuoteSubmitted,
  EventDetailType,
} from '../../src/domain/domain-events';
import { getDataUrlAsync, putDomainEventAsync } from '../../src/lib/utils';
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
      loanDetails: {
        amount: 1000,
        termMonths: 12,
      },
      personalDetails: {
        firstName: '',
        lastName: '',
        niNumber: '',
        address: {
          lines: [],
          postcode: '',
        },
      },
    };

    const quoteRequestDataUrl = await getDataUrlAsync({
      bucketName: dataBucket.bucketName,
      key: 'test-key',
      data: JSON.stringify(quoteRequest),
      expirySeconds: 5 * 60,
    });

    const quoteSubmitted: QuoteSubmitted = {
      metadata: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
        domain: 'test-domain',
        service: 'test-service',
      },
      data: {
        quoteReference: 'test-quoteReference',
        quoteRequestDataUrl,
      },
    };

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

    expect(observations[0].data.detail.data.quoteReference).toBe(
      quoteSubmitted.data.quoteReference
    );

    expect(observations[0].data.detail.data.loanDetails).toEqual(
      quoteRequest.loanDetails
    );
  });
});
