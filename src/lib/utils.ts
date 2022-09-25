import fetch from 'node-fetch';
import { customAlphabet } from 'nanoid';
import { S3 } from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import EventBridge, {
  PutEventsRequest,
  PutEventsRequestEntry,
  PutEventsResponse,
} from 'aws-sdk/clients/eventbridge';
import { DomainEvent, EventDetailType } from '../domain/domain-events';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16);
const s3 = new S3();
const eventBridge = new EventBridge();

export const fetchFromUrlAsync = async <T>(url: string): Promise<T> => {
  const fetchResponse = await fetch(url);
  return (await fetchResponse.json()) as T;
};

export const generateQuoteReference = (): string => {
  const todayDateString = new Date().toISOString().slice(0, 10);
  const reference = `${todayDateString}-${nanoid().slice(0, 9)}`;
  return reference;
};

export const getDataUrlAsync = async ({
  bucketName,
  key,
  data,
  expirySeconds,
}: {
  bucketName?: string;
  key: string;
  data: string;
  expirySeconds?: number;
}): Promise<string> => {
  //
  if (bucketName === undefined) throw new Error('bucketName === undefined');

  const s3Params = {
    Bucket: bucketName,
    Key: key,
  };

  await s3
    .putObject({
      ...s3Params,
      ACL: 'bucket-owner-full-control',
      Body: data,
    } as PutObjectRequest)
    .promise();

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

  const dataUrl = await s3.getSignedUrlPromise('getObject', {
    ...s3Params,
    Expires: expirySeconds ?? 60,
  });

  return dataUrl;
};

export const putDomainEventAsync = async <T extends Record<string, any>>({
  eventBusName,
  detailType,
  event: domainEvent,
}: {
  eventBusName?: string;
  detailType: EventDetailType;
  event: DomainEvent<T>;
}): Promise<PutEventsResponse> => {
  //
  if (eventBusName === undefined) throw new Error('eventBusName === undefined');

  const requestEntry: PutEventsRequestEntry = {
    Source: `${domainEvent.metadata.domain}.${domainEvent.metadata.service}`,
    DetailType: detailType,
    Detail: JSON.stringify(domainEvent),
    EventBusName: eventBusName,
  };

  const request: PutEventsRequest = {
    Entries: [requestEntry],
  };

  return eventBridge.putEvents(request).promise();
};
