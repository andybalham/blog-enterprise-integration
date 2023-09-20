/* eslint-disable no-console */
import axios from 'axios';
import dotenv from 'dotenv';
import { QuoteRequest } from '../src/domain/domain-models';

dotenv.config();
jest.setTimeout(2 * 60 * 1000);

describe('Simulation Test Suite', () => {
  //
  it('Performs a basic test', async () => {
    const requestApiUrl = `${process.env.PROD_END_POINT}requests`;

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
      headers: {
        'x-correlation-id': correlationId,
        'x-api-key': process.env.PROD_API_KEY ?? '<undefined>',
      },
    });

    expect(response.status).toBe(201);
  });

  it('Performs 20 random tests', async () => {
    const requestApiUrl = `${process.env.PROD_END_POINT}requests`;

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 20; i++) {
      //
      const quoteRequest: QuoteRequest = {
        personalDetails: {
          firstName: 'Alex',
          lastName: 'Pritchard',
          niNumber: `NI${Math.floor(Math.random() * 1000000000)}`,
          address: {
            lines: ['999 The Avenue', 'Townsville'],
            postcode: 'AB1 2CD',
          },
        },
        loanDetails: {
          amount: 1000 + 1000 * Math.floor(Math.random() * 24),
          termMonths: 12 + 12 * Math.floor(Math.random() * 5),
        },
      };

      const correlationId = quoteRequest.personalDetails.niNumber;

      // Act

      // eslint-disable-next-line no-await-in-loop
      const response = await axios.post(requestApiUrl, quoteRequest, {
        headers: {
          'x-correlation-id': correlationId,
          'x-api-key': process.env.PROD_API_KEY ?? '<undefined>',
        },
      });

      console.log(JSON.stringify({ response: response.data }, null, 2));
    }
  });
});
