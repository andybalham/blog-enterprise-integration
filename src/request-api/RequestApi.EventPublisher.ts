/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import EventBridge, {
  PutEventsRequest,
  PutEventsRequestEntry,
} from 'aws-sdk/clients/eventbridge';
import S3, { PutObjectRequest } from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';
import { generateQuoteReference } from '../lib/utils';
import {
  EventDomain,
  EventDetailType,
  QuoteSubmitted,
  EventService,
} from '../domain/domain-events';

export const DATA_BUCKET_NAME = 'DATA_BUCKET_NAME';
export const APPLICATION_EVENT_BUS_NAME = 'APPLICATION_EVENT_BUS_NAME';

const s3 = new S3();
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

  // Generate the id and reference

  const correlationId = event.headers['x-correlation-id'] ?? randomUUID();
  const quoteReference = generateQuoteReference();

  // Store the body and get a pre-signed URL

  const s3Params = {
    Bucket: bucketName,
    Key: `${quoteReference}/${quoteReference}-quote-request.json`,
  };

  await s3
    .putObject({
      ...s3Params,
      ACL: 'bucket-owner-full-control',
      Body: event.body,
    } as PutObjectRequest)
    .promise();

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

  const quoteRequestDataUrl = await s3.getSignedUrlPromise('getObject', {
    ...s3Params,
    Expires: 5 * 60, // 5 minutes
  });

  // Publish the event to process the quote

  const quoteSubmitted: QuoteSubmitted = {
    metadata: {
      correlationId,
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
