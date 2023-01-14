/* eslint-disable class-methods-use-this */
import { DocumentClient, PutItemInput } from 'aws-sdk/clients/dynamodb';
import {
  DomainEventBase,
  DomainEventMetadata,
  EventType,
} from '../domain/domain-events';

export const ENV_REQUEST_EVENT_TABLE_NAME = 'REQUEST_EVENT_TABLE_NAME';
const tableName = process.env[ENV_REQUEST_EVENT_TABLE_NAME] ?? 'undefined';
const documentClient = new DocumentClient();

interface RequestEventItem extends Record<string, any> {
  requestId: string;
  SK: string;
  receivedTime: string;
  eventType: EventType;
  eventId: string;
  correlationId: string;
  metadata: DomainEventMetadata;
  data: Record<string, any>;
  expiryTime: number;
}

export default class RequestEventTableClient {
  async putEventAsync(event: DomainEventBase): Promise<void> {
    //
    const receivedTimeMillis = Date.now();
    const receivedTimeSeconds = Math.floor(receivedTimeMillis / 1000);
    const oneDaySeconds = 60 * 24;

    const requestEventItem: RequestEventItem = {
      requestId: event.metadata.requestId,
      SK: `${receivedTimeMillis}#${event.metadata.eventId}`,
      receivedTime: new Date(receivedTimeMillis).toISOString(),
      eventType: event.metadata.eventType,
      eventId: event.metadata.eventId,
      correlationId: event.metadata.correlationId,
      metadata: event.metadata,
      data: event.data,
      expiryTime: receivedTimeSeconds + oneDaySeconds,
    };

    const putItem: PutItemInput = {
      TableName: tableName,
      Item: requestEventItem,
    };

    await documentClient.put(putItem).promise();
  }

  async getEventsByType(
    requestId: string,
    eventType: EventType
  ): Promise<DomainEventBase[]> {
    // If we use QueryInput, then we get a 'Condition parameter type does not match schema type'
    const queryParams /*: QueryInput */ = {
      TableName: tableName,
      KeyConditionExpression: `requestId = :requestId`,
      FilterExpression: `eventType = :eventType`,
      ExpressionAttributeValues: {
        ':requestId': requestId,
        ':eventType': eventType.toString(),
      },
    };

    // In production, we would need to worry about continuation tokens
    const queryOutput = await documentClient.query(queryParams).promise();

    if (!queryOutput.Items) {
      return [];
    }

    return queryOutput.Items.map((i) => {
      const event: DomainEventBase = {
        metadata: i.metadata as DomainEventMetadata,
        data: i.data as Record<string, any>,
      };

      return event;
    });
  }
}
