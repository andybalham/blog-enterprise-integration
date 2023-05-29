/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { EventBridgeEvent } from 'aws-lambda';
import { SSM } from '@aws-sdk/client-ssm';
import {
  LenderRateReceivedV1,
  EventType,
  EventDomain,
  EventService,
  newLenderRateRequestedV1,
} from '../../src/domain/domain-events';
import {
  CreditReport,
  LenderRate,
  LenderRegisterEntry,
  QuoteRequest,
} from '../../src/domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../../src/lib/utils';
import LenderGatewayTestStack, {
  LENDERS_PARAMETER_PATH_PREFIX,
  TEST_LENDER_ID,
} from './LenderGatewayTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('LenderGateway tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: LenderGatewayTestStack.Id,
  });

  const ssm = new SSM({});

  let dataBucket: S3TestClient;
  let loanBrokerEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(
      LenderGatewayTestStack.DataBucketId
    );

    loanBrokerEventBus = testClient.getEventBridgeTestClient(
      LenderGatewayTestStack.LoanBrokerEventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await dataBucket.clearAllObjectsAsync();
  });

  test(`SSM parameter is registered`, async () => {
    const lenderParams = await ssm.getParametersByPath({
      Path: `/${LENDERS_PARAMETER_PATH_PREFIX}`,
    });

    const lenders = lenderParams.Parameters?.filter((p) => p.Value).map(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (p) => JSON.parse(p.Value!) as LenderRegisterEntry
    );

    expect(lenders?.some((l) => l.lenderId === TEST_LENDER_ID)).toBeTruthy();
  });

  test(`LenderRateReceived is raised`, async () => {
    // Arrange

    const quoteRequest: QuoteRequest = {
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
      personalDetails: {
        firstName: 'Trevor',
        lastName: 'Potato',
        niNumber: 'YE342564T',
        address: {
          lines: ['Line1'],
          postcode: 'HR8 35F',
        },
      },
    };

    const creditReport: CreditReport = {
      reportReference: 'test-report-reference',
      creditScore: 666,
      hasBankruptcies: false,
      onElectoralRoll: true,
    };

    const quoteRequestDataUrl = await getDataUrlAsync({
      bucketName: dataBucket.bucketName,
      key: 'test-quote-request',
      data: JSON.stringify(quoteRequest),
      expirySeconds: 5 * 60,
    });

    const creditReportDataUrl = await getDataUrlAsync({
      bucketName: dataBucket.bucketName,
      key: 'test-credit-report',
      data: JSON.stringify(creditReport),
      expirySeconds: 5 * 60,
    });

    const lenderRateRequested = newLenderRateRequestedV1({
      context: {
        correlationId: 'test-correlationId',
        requestId: 'test-requestId',
      },
      origin: {
        domain: EventDomain.LoanBroker,
        service: EventService.LoanBroker,
      },
      data: {
        request: {
          quoteReference: 'test-quote-reference',
          quoteRequestDataUrl,
          creditReportDataUrl,
          lenderId: TEST_LENDER_ID,
        },
        taskToken: 'test-task-token',
      },
    });

    // Act

    await putDomainEventAsync({
      eventBusName: loanBrokerEventBus.eventBusArn,
      domainEvent: lenderRateRequested,
    });

    // Await

    const { timedOut, observations } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    const firstEvent = observations[0].data as EventBridgeEvent<
      'LenderRateReceived',
      LenderRateReceivedV1
    >;

    expect(firstEvent['detail-type']).toBe(EventType.LenderRateReceived);

    expect(firstEvent.detail.metadata.correlationId).toBe(
      lenderRateRequested.metadata.correlationId
    );

    expect(firstEvent.detail.metadata.requestId).toBe(
      lenderRateRequested.metadata.requestId
    );

    expect(firstEvent.detail.data.taskToken).toBe(
      lenderRateRequested.data.taskToken
    );

    expect(firstEvent.detail.data.resultType).toBe('SUCCEEDED');

    if (firstEvent.detail.data.resultType === 'SUCCEEDED') {
      expect(firstEvent.detail.data.payload.lenderRateDataUrl).toBeDefined();

      const lenderRate = await fetchFromUrlAsync<LenderRate>(
        firstEvent.detail.data.payload.lenderRateDataUrl
      );

      expect(lenderRate.lenderId).toBe(TEST_LENDER_ID);
    }
  });
});
