/* eslint-disable import/prefer-default-export */

import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { DomainEventBase } from '../domain/domain-events';

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  console.log({ ...event.detail.metadata, data: event.detail.data });
};
