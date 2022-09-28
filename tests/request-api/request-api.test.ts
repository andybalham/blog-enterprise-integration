/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import {
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import axios from 'axios';
import {
  EventDomain,
  EventService,
  QuoteSubmitted,
} from '../../src/domain/domain-events';
import { QuoteRequest } from '../../src/domain/domain-models';
import LoanBrokerFileStore from '../../src/lib/LoanBrokerFileStore';
import RequestApiTestStack from './RequestApiTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('RequestApi Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: RequestApiTestStack.Id,
  });

  let requestApiBaseUrl: string | undefined;
  let quoteBucket: S3TestClient;
  let loanBrokerFileStore: LoanBrokerFileStore;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    requestApiBaseUrl = testClient.getApiGatewayBaseUrlByStackId(
      RequestApiTestStack.RequestApiId
    );

    quoteBucket = testClient.getS3TestClient(RequestApiTestStack.QuoteBucketId);
    loanBrokerFileStore = new LoanBrokerFileStore(quoteBucket.bucketName);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await quoteBucket.clearAllObjectsAsync();
  });

  test(`request event published as expected`, async () => {
    // Arrange

    const requestApiUrl = `${requestApiBaseUrl}/prod/requests`;

    const quoteRequest: QuoteRequest = {
      personalDetails: {
        firstName: 'Alex',
        lastName: 'Pritchard',
        niNumber: 'AB123456C',
        address: {
          lines: ['999 The Avenue', 'Townsville'],
          postcode: 'AB1 2CD',
        },
      },
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
    };

    const correlationId = 'request-event-published-as-expected';

    // Act

    const response = await axios.post(requestApiUrl, quoteRequest, {
      headers: { 'x-correlation-id': correlationId },
    });

    expect(response.status).toBe(201);

    const { quoteReference } = response.data;

    expect(quoteReference).toBeDefined();

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      filterById: RequestApiTestStack.QuoteSubmittedObserverId,
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    const actualEvent = observations[0].data.detail as QuoteSubmitted;

    expect(actualEvent.metadata.domain).toBe(EventDomain.LoanBroker);
    expect(actualEvent.metadata.service).toBe(EventService.RequestApi);
    expect(actualEvent.metadata.correlationId).toBe(correlationId);
    expect(actualEvent.metadata.requestId).toBeDefined();

    expect(actualEvent.data.quoteReference).toBe(quoteReference);

    const actualQuoteRequest = await loanBrokerFileStore.getQuoteRequestAsync(
      actualEvent.data.quoteReference
    );

    expect(actualQuoteRequest).toMatchObject(quoteRequest);
  });
});
