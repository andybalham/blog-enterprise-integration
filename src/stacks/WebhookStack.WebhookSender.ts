/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda';
import axios from 'axios';
import { QuoteProcessedV1 } from '../domain/domain-events';

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<'QuoteProcessed', QuoteProcessedV1>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  console.log(
    JSON.stringify({ WEBHOOK_URL: process.env.WEBHOOK_URL }, null, 2)
  );

  const response = await axios.post(
    process.env.WEBHOOK_URL ?? '<undefined>',
    {
      quoteReference: event.detail.data.quoteReference,
      loanDetails: event.detail.data.loanDetails,
      lenderName: event.detail.data.bestLenderRate?.lenderName,
      bestRate: event.detail.data.bestLenderRate?.rate,
    },
    {
      headers: { 'x-correlation-id': event.detail.metadata.correlationId },
    }
  );

  console.log(JSON.stringify({ response }, null, 2));
};
