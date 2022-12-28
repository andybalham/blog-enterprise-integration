/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
} from '@andybalham/cdk-cloud-test-kit';
import {
  EventDomain,
  EventService,
  newLenderRateReceivedV1,
  newLenderRateRequestedV1,
  newQuoteSubmittedV1,
} from '../../src/domain/domain-events';
import { putDomainEventAsync } from '../../src/lib/utils';
import ObservabilityTestStack from './ObservabilityTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('Observability tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: ObservabilityTestStack.Id,
  });

  let loanBrokerEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    loanBrokerEventBus = testClient.getEventBridgeTestClient(
      ObservabilityTestStack.LoanBrokerEventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  test(`QuoteSubmitted`, async () => {
    // Arrange

    const domainEvent = newQuoteSubmittedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.RequestApi,
      },
      data: {
        quoteReference: 'test-quoteReference',
        quoteRequestDataUrl: 'test-quoteRequestDataUrl',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => true,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });

  test(`LenderRateRequested`, async () => {
    // Arrange

    const domainEvent = newLenderRateRequestedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LenderGateway,
      },
      data: {
        request: {
          lenderId: 'test-lenderId',
          quoteReference: 'test-quoteReference',
          quoteRequestDataUrl: 'test-quoteRequestDataUrl',
          creditReportDataUrl: 'test-creditReportDataUrl',
        },
        taskToken: 'test-taskToken',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => true,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });

  test(`LenderRateReceived`, async () => {
    // Arrange

    const domainEvent = newLenderRateReceivedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LenderGateway,
      },
      data: {
        resultType: 'SUCCEEDED',
        payload: {
          lenderId: 'test-lenderId',
          isRateAvailable: true,
          lenderRateDataUrl: 'test-lenderRateDataUrl',
        },
        taskToken: 'test-taskToken',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => true,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });
});
