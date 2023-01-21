/* eslint-disable class-methods-use-this */
import {
  DynamoDBTableClientFactory,
  QueryInput,
} from '../../@andybalham/aws-client-wrappers/DynamoDBTableClient';
import {
  DomainEventBase,
  DomainEventMetadata,
  EventType,
} from '../domain/domain-events';

export const ENV_REQUEST_EVENT_TABLE_NAME = 'REQUEST_EVENT_TABLE_NAME';
const requestEventTable = new DynamoDBTableClientFactory({
  partitionKeyName: 'requestId',
  sortKeyName: 'SK',
}).build(process.env[ENV_REQUEST_EVENT_TABLE_NAME]);

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

    await requestEventTable.putAsync(requestEventItem);
  }

  async getEventsByType(
    requestId: string,
    eventType: EventType
  ): Promise<DomainEventBase[]> {
    //
    const queryParams: QueryInput = {
      partitionKeyValue: requestId,
      FilterExpression: `eventType = :eventType`,
      ExpressionAttributeValues: {
        ':eventType': eventType,
      },
    };

    const queryOutput = await requestEventTable.queryAllAsync<RequestEventItem>(
      queryParams
    );

    return queryOutput.map((i) => {
      const event: DomainEventBase = {
        metadata: i.metadata as DomainEventMetadata,
        data: i.data as Record<string, any>,
      };

      return event;
    });
  }
}
