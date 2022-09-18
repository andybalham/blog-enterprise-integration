/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import { IntegrationTestClient } from '@andybalham/cdk-cloud-test-kit';
import axios from 'axios';
import { LoanApplicationDetails } from '../../src/domain/domain-models';
import RequestApiTestStack from './RequestApiTestStack';

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

    const loanApplicationDetails: LoanApplicationDetails = {
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

    // Act

    const response = await axios.post(requestApiUrl, loanApplicationDetails);

    expect(response.status).toBe(201);

    const { applicationReference } = response.data;

    expect(applicationReference).toBeDefined();

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut).toBeFalsy();

    const { actualEventDetail, actualLoanApplicationDetails } =
      observations[0].data;

    expect(actualEventDetail.data.loanApplicationReference).toBe(
      applicationReference
    );

    expect(actualLoanApplicationDetails).toMatchObject(loanApplicationDetails);
  });
});
