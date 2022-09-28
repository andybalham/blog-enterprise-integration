/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { generateQuoteReference, putDomainEventAsync } from '../lib/utils';
import {
  EventDomain,
  EventDetailType,
  QuoteSubmitted,
  EventService,
} from '../domain/domain-events';
import LoanBrokerFileStore from '../lib/LoanBrokerFileStore';
import { QuoteRequest } from '../domain/domain-models';

export const DATA_BUCKET_NAME = 'DATA_BUCKET_NAME';
export const APPLICATION_EVENT_BUS_NAME = 'APPLICATION_EVENT_BUS_NAME';

const bucketName = process.env[DATA_BUCKET_NAME];
const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

const loanBrokerFileStore = new LoanBrokerFileStore(bucketName);

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (event.body === null) {
    return {
      statusCode: 400, // Bad Request
    };
  }

  // In production we would validate both the header and the body
  const correlationId = event.headers['x-correlation-id'] ?? randomUUID();
  const quoteRequest: QuoteRequest = JSON.parse(event.body);

  const quoteReference = generateQuoteReference();
  await loanBrokerFileStore.putQuoteRequestAsync(quoteReference, quoteRequest);

  const quoteSubmitted: QuoteSubmitted = {
    metadata: {
      correlationId,
      requestId: event.requestContext.requestId,
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      quoteReference,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.QuoteSubmitted,
    event: quoteSubmitted,
  });

  // Return the reference

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteReference }),
  };
};
