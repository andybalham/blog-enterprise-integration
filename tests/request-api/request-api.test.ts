/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import { IntegrationTestClient } from '@andybalham/cdk-cloud-test-kit';
import axios from 'axios';
import { EventDomain, EventService } from '../../src/domain/domain-events';
import { QuoteRequest } from '../../src/domain/domain-models';
import RequestApiTestStack from './RequestApiTestStack';
import { QuoteSubmittedObservation } from './RequestApiTestStack.EventObserver';

jest.setTimeout(2 * 60 * 1000);

describe('RequestApi Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: RequestApiTestStack.Id,
  });

  let requestApiBaseUrl: string | undefined;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    requestApiBaseUrl = testClient.getApiGatewayBaseUrlByStackId(
      RequestApiTestStack.RequestApiId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
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
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    const { actualEvent, actualQuoteRequest } = observations[0]
      .data as QuoteSubmittedObservation;

    expect(actualEvent.metadata.domain).toBe(EventDomain.LoanBroker);
    expect(actualEvent.metadata.service).toBe(EventService.RequestApi);
    expect(actualEvent.metadata.correlationId).toBe(correlationId);
    expect(actualEvent.metadata.requestId).toBeDefined();

    expect(actualEvent.data.quoteReference).toBe(quoteReference);

    expect(actualQuoteRequest).toMatchObject(quoteRequest);
  });
});
