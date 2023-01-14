/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda';
import axios from 'axios';
import {
  CreditReportFailedV1,
  QuoteProcessedV1,
} from '../domain/domain-events';

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<
    'QuoteProcessed' | 'CreditReportFailed',
    QuoteProcessedV1 | CreditReportFailedV1
  >
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  console.log(
    JSON.stringify({ WEBHOOK_URL: process.env.WEBHOOK_URL }, null, 2)
  );

  if ('loanDetails' in event.detail.data) {
    const response = await axios.post(
      process.env.WEBHOOK_URL ?? '<undefined>',
      {
        result: 'SUCCESS',
        quoteReference: event.detail.data.quoteReference,
        loanDetails: event.detail.data.loanDetails,
        lenderName: event.detail.data.bestLenderRate?.lenderName,
        bestRate: event.detail.data.bestLenderRate?.rate,
      },
      {
        headers: { 'x-correlation-id': event.detail.metadata.correlationId },
      }
    );

    console.log(
      JSON.stringify({ response: { status: response.status } }, null, 2)
    );
    //
  } else {
    //
    const response = await axios.post(
      process.env.WEBHOOK_URL ?? '<undefined>',
      {
        result: 'FAILED',
        quoteReference: event.detail.data.quoteReference,
      },
      {
        headers: { 'x-correlation-id': event.detail.metadata.correlationId },
      }
    );

    console.log(JSON.stringify({ response }, null, 2));
  }
};
