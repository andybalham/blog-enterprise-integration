/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda';
import axios from 'axios';
import { QuoteProcessed } from '../domain/domain-events';

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<'QuoteProcessed', QuoteProcessed>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  console.log(
    JSON.stringify({ WEBHOOK_URL: process.env.WEBHOOK_URL }, null, 2)
  );

  const response = await axios.post(
    process.env.WEBHOOK_URL ?? '<undefined>',
    event.detail.data,
    {
      headers: { 'x-correlation-id': event.detail.metadata.correlationId },
    }
  );

  console.log(JSON.stringify({ response }, null, 2));
};
