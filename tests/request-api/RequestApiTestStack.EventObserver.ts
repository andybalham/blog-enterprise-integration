/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { recordObservationDataAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { fetchFromUrlAsync } from '../../src/lib/utils';
import { QuoteRequest } from '../../src/domain/domain-models';
import { QuoteSubmittedV1 } from '../../src/domain/domain-events';

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface QuoteSubmittedObservation {
  actualEvent: QuoteSubmittedV1;
  actualQuoteRequest: QuoteRequest;
}

export const handler = async (
  event: EventBridgeEvent<'QuoteSubmitted', QuoteSubmittedV1>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const actualQuoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    event.detail.data.quoteRequestDataUrl
  );

  const observation: QuoteSubmittedObservation = {
    actualEvent: event.detail,
    actualQuoteRequest,
  };

  await recordObservationDataAsync(documentClient, observation);
};
