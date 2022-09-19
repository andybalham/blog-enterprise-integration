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
import { customAlphabet } from 'nanoid';
import {
  EventDomain,
  EventDetailType,
  LoanApplicationSubmitted,
  EventService,
} from '../domain/domain-events';

export const DATA_BUCKET_NAME = 'DATA_BUCKET_NAME';
export const APPLICATION_EVENT_BUS_NAME = 'APPLICATION_EVENT_BUS_NAME';

const s3 = new S3();
const bucketName = process.env[DATA_BUCKET_NAME];

const eventBridge = new EventBridge();
const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16);

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (event.body === null) {
    return {
      statusCode: 400, // Bad Request
    };
  }

  // Generate the id and reference

  const correlationId = event.headers['x-correlation-id'] ?? randomUUID();
  const loanApplicationReference = getLoanApplicationReference();

  // Store the body and get a pre-signed URL

  const s3Params = {
    Bucket: bucketName,
    Key: `${loanApplicationReference}/${loanApplicationReference}-quote-request.json`,
  };

  await s3
    .putObject({
      ...s3Params,
      ACL: 'bucket-owner-full-control',
      Body: event.body,
    } as PutObjectRequest)
    .promise();

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

  const loanApplicationDetailsUrl = await s3.getSignedUrlPromise('getObject', {
    ...s3Params,
    Expires: 5 * 60, // 5 minutes
  });

  // Publish the event to process the application

  const loanApplicationSubmitted: LoanApplicationSubmitted = {
    metadata: {
      correlationId,
      requestId: event.requestContext.requestId,
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      loanApplicationReference,
      loanApplicationDetailsUrl,
    },
  };

  const requestEntry: PutEventsRequestEntry = {
    Source: `${loanApplicationSubmitted.metadata.domain}.${loanApplicationSubmitted.metadata.service}`,
    DetailType: EventDetailType.LoanApplicationSubmitted,
    Detail: JSON.stringify(loanApplicationSubmitted),
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
    body: JSON.stringify({ applicationReference: loanApplicationReference }),
  };
};

function getLoanApplicationReference(): string {
  const todayDateString = new Date().toISOString().slice(0, 10);
  const reference = `${todayDateString}-${nanoid().slice(0, 9)}`;
  return reference;
}
