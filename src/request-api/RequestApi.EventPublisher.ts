/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  generateQuoteReference,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../lib/utils';
import {
  EventDomain,
  EventService,
  newQuoteSubmittedV1,
} from '../domain/domain-events';

export const REQUEST_API_DATA_BUCKET_NAME = 'REQUEST_API_DATA_BUCKET_NAME';
export const LOAN_BROKER_EVENT_BUS = 'LOAN_BROKER_EVENT_BUS';

const bucketName = process.env[REQUEST_API_DATA_BUCKET_NAME];
const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (event.body === null) {
    return {
      statusCode: 400, // Bad Request
    };
  }

  // Generate the reference, store the request, and get a pre-signed URL

  const quoteReference = generateQuoteReference();

  const quoteRequestDataUrl = await getDataUrlAsync({
    bucketName,
    key: `${quoteReference}-quote-request.json`,
    data: event.body,
    expirySeconds: 5 * 60, // 5 minutes
  });

  // Publish the event to process the quote

  const correlationId = event.headers['x-correlation-id'] ?? randomUUID();

  const quoteSubmitted = newQuoteSubmittedV1({
    context: {
      correlationId,
      requestId: event.requestContext.requestId,
    },
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      quoteReference,
      quoteRequestDataUrl,
    },
  });

  await putDomainEventAsync({
    eventBusName,
    domainEvent: quoteSubmitted,
  });

  // Return the reference

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: quoteSubmitted.metadata.requestId,
      quoteReference: quoteSubmitted.data.quoteReference,
    }),
  };
};
