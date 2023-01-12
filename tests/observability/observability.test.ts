/* eslint-disable no-console */
import { v4 as uuidv4 } from 'uuid';
import {
  EventBridgeTestClient,
  IntegrationTestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { DateTime } from 'luxon';
import {
  EventDomain,
  EventService,
  newCreditReportFailedV1,
  newLenderRateReceivedV1,
  newLenderRateRequestedV1,
  newQuoteProcessedV1,
  newQuoteSubmittedV1,
} from '../../src/domain/domain-events';
import { putDomainEventAsync } from '../../src/lib/utils';
import ObservabilityTestStack from './ObservabilityTestStack';
import { emptyLoanDetails } from '../lib/model-examples';

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
        correlationId: uuidv4(),
        requestId: uuidv4(),
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

  test.only(`QuoteProcessed`, async () => {
    // Arrange

    const quoteSubmittedEvent = newQuoteSubmittedV1({
      context: {
        correlationId: uuidv4(),
        requestId: uuidv4(),
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

    const quoteProcessedEvent = newQuoteProcessedV1({
      context: {
        correlationId: quoteSubmittedEvent.metadata.correlationId,
        requestId: quoteSubmittedEvent.metadata.requestId,
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.RequestApi,
      },
      data: {
        quoteReference: 'test-quoteReference',
        loanDetails: emptyLoanDetails,
        bestLenderRate: {
          lenderId: 'test-lenderId',
          lenderName: 'test-lenderName',
          rate: 6.66,
        },
      },
    });

    (quoteProcessedEvent.metadata as any).timestamp = DateTime.fromISO(
      quoteSubmittedEvent.metadata.timestamp
    )
      .plus({ seconds: 3 })
      .toISOTime();

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent: quoteSubmittedEvent,
    });

    await IntegrationTestClient.sleepAsync(1);

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent: quoteProcessedEvent,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 1,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });

  test(`LenderRateRequested`, async () => {
    // Arrange

    const domainEvent = newLenderRateRequestedV1({
      context: {
        correlationId: uuidv4(),
        requestId: uuidv4(),
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
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });

  test(`LenderRateReceived`, async () => {
    // Arrange

    const domainEvent = newLenderRateReceivedV1({
      context: {
        correlationId: uuidv4(),
        requestId: uuidv4(),
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
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });

  test(`CreditReportFailed`, async () => {
    // Arrange

    const domainEvent = newCreditReportFailedV1({
      context: {
        correlationId: uuidv4(),
        requestId: uuidv4(),
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LoanBroker,
      },
      data: {
        error: 'test-error',
        executionId: 'test-executionId',
        executionStartTime: 'test-executionStartTime',
        quoteReference: 'test-quoteReference',
        stateMachineId: 'test-stateMachineId',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });
});
