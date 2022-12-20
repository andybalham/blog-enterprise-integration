/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
} from '@andybalham/cdk-cloud-test-kit';
import {
  EventDomain,
  EventService,
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

  test(`Observe quote submitted event`, async () => {
    // Arrange

    const creditReportRequested = newQuoteSubmittedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LoanBroker,
      },
      data: {
        quoteReference: 'test-quoteReference',
        quoteRequestDataUrl: 'test-quoteRequestDataUrl'
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent: creditReportRequested,
    });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => true,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });
});
