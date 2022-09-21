/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import {
  IntegrationTestClient,
  S3TestClient,
} from '@andybalham/cdk-cloud-test-kit';
import { getDataUrlAsync } from '../../src/lib/utils';
import QuoteProcessorTestStack from './QuoteProcessorTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('QuoteProcessor Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: QuoteProcessorTestStack.Id,
  });

  let dataBucket: S3TestClient;
  // let applicationEventBus: EventBridgeTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    dataBucket = testClient.getS3TestClient(
      QuoteProcessorTestStack.DataBucketId
    );

    // applicationEventBus = testClient.getEventBridgeTestClient(
    //   QuoteProcessorTestStack.ApplicationEventBusId
    // );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();

    await dataBucket.clearAllObjectsAsync();
  });

  test(`Submitted event results in processed event`, async () => {
    // Arrange

    // Act

    const dataUrl = await getDataUrlAsync({
      bucketName: dataBucket.bucketName,
      key: 'TestKey',
      data: JSON.stringify({ some: 'data' }),
      expirySeconds: 5 * 60,
    });

    // Await

    // Assert

    expect(dataUrl).toBeDefined();
  });
});
