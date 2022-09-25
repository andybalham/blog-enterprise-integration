/* eslint-disable no-console */
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import {
  CreditReportRequested,
  EventDetailType,
  EventDomain,
  EventService,
} from '../../src/domain/domain-events';
import { QuoteRequest } from '../../src/domain/domain-models';
import { getDataUrlAsync, putDomainEventAsync } from '../../src/lib/utils';
import { emptyQuoteRequest } from '../lib/model-examples';
import CreditBureauTestStack from './CreditBureauTestStack';

jest.setTimeout(2 * 60 * 1000);

const myQuoteRequest: QuoteRequest = {
  ...emptyQuoteRequest,
};

describe('CreditBureau tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: CreditBureauTestStack.Id,
  });

  let dataBucket: S3TestClient;
  let applicationEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(CreditBureauTestStack.DataBucketId);

    applicationEventBus = testClient.getEventBridgeTestClient(
      CreditBureauTestStack.ApplicationEventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await dataBucket.clearAllObjectsAsync();
  });

  [{ quoteRequest: myQuoteRequest }].forEach((theory) => {
    test(`${JSON.stringify(theory)}`, async () => {
      // Arrange

      const quoteRequest: QuoteRequest = {
        ...emptyQuoteRequest,
      };

      const quoteRequestDataUrl = await getDataUrlAsync({
        bucketName: dataBucket.bucketName,
        key: 'test-quote-request',
        data: JSON.stringify(quoteRequest),
        expirySeconds: 5 * 60,
      });

      const creditReportRequested: CreditReportRequested = {
        metadata: {
          domain: EventDomain.LoanBroker,
          service: EventService.QuoteProcessor,
          correlationId: 'test-correlationId',
          requestId: 'test-requestId',
        },
        data: {
          quoteReference: 'test-quote-reference',
          quoteRequestDataUrl,
        },
      };

      // Act

      await putDomainEventAsync({
        eventBusName: applicationEventBus.eventBusArn,
        detailType: EventDetailType.CreditReportRequested,
        event: creditReportRequested,
      });

      // Await

      const { timedOut, observations } = await testClient.pollTestAsync({
        until: async (o) => o.length > 0,
      });

      // Assert

      expect(timedOut).toBeFalsy();

      const firstEvent = observations[0].data;

      console.log(JSON.stringify({ firstEvent }, null, 2));
    });
  });
});
