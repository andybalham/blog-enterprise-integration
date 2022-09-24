import { IntegrationTestClient } from '@andybalham/cdk-cloud-test-kit';
import CreditBureauTestStack from './CreditBureauTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('CreditBureau tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: CreditBureauTestStack.Id,
  });

  beforeAll(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  test('Something happens', async () => {
    // Arrange

    // Act

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();
  });
});
