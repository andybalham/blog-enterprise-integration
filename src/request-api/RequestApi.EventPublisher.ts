/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import EventBridge, {
  PutEventsRequest,
  PutEventsRequestEntry,
} from 'aws-sdk/clients/eventbridge';
import { randomUUID } from 'crypto';
import {
  generateQuoteReference,
  putDataInS3Async as getDataUrlAsync,
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

const eventBridge = new EventBridge();
const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (event.body === null) {
    return {
      statusCode: 400, // Bad Request
    };
  }

  // Generate the reference

  const quoteReference = generateQuoteReference();

  // Store the body and get a pre-signed URL

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

  const requestEntry: PutEventsRequestEntry = {
    Source: `${quoteSubmitted.metadata.domain}.${quoteSubmitted.metadata.service}`,
    DetailType: EventDetailType.QuoteSubmitted,
    Detail: JSON.stringify(quoteSubmitted),
    EventBusName: eventBusName,
  };

  const request: PutEventsRequest = {
    Entries: [requestEntry],
  };

  const response = await eventBridge.putEvents(request).promise();

  console.log(JSON.stringify({ response }, null, 2));

  // Return the reference

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteReference }),
  };
};
