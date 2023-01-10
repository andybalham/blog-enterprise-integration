/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { DomainEventBase } from '../domain/domain-events';
import RequestEventTableClient from './RequestEventTableClient';

const requestEventTableClient = new RequestEventTableClient();

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  console.log({ ...event.detail.metadata, data: event.detail.data });

  await requestEventTableClient.putEventAsync(event.detail);
};
