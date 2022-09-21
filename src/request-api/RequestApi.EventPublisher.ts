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
  EventDetailType,
  QuoteSubmitted,
  EventService,
} from '../domain/domain-events';

export const DATA_BUCKET_NAME = 'DATA_BUCKET_NAME';
export const APPLICATION_EVENT_BUS_NAME = 'APPLICATION_EVENT_BUS_NAME';

const bucketName = process.env[DATA_BUCKET_NAME];
const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

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
    key: `${quoteReference}/${quoteReference}-quote-request.json`,
    data: event.body,
    expirySeconds: 5 * 60, // 5 minutes
  });

  // Publish the event to process the quote

  const quoteSubmitted: QuoteSubmitted = {
    metadata: {
      correlationId: event.headers['x-correlation-id'] ?? randomUUID(),
      requestId: event.requestContext.requestId,
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      quoteReference,
      quoteRequestDataUrl,
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
