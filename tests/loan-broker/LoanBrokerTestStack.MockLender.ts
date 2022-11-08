/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { getTestPropsAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { EventBridgeEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
  LenderRateRequestedV1,
  EventDomain,
  EventService,
  newLenderRateReceivedV1,
} from '../../src/domain/domain-events';
import { LenderRate } from '../../src/domain/domain-models';
import {
  LOAN_BROKER_EVENT_BUS,
  LENDER_GATEWAY_DATA_BUCKET_NAME,
} from '../../src/lender-gateway/constants';
import { getDataUrlAsync, putDomainEventAsync } from '../../src/lib/utils';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const dataBucketName = process.env[LENDER_GATEWAY_DATA_BUCKET_NAME];

const documentClient = new DocumentClient();

export interface MockLenderResponse {
  resultType: 'SUCCEEDED' | 'FAILED';
  lenderRate?: LenderRate;
}

export const handler = async (
  event: EventBridgeEvent<'RateRequested', LenderRateRequestedV1>
): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const testProps = await getTestPropsAsync(documentClient);

  console.log(JSON.stringify({ testProps }, null, 2));

  const { lenderId } = event.detail.data.request;

  const lenderResponse: MockLenderResponse | undefined = testProps.inputs
    ?.lenderResponses
    ? testProps.inputs.lenderResponses[lenderId]
    : undefined;

  if (!lenderResponse) {
    return;
  }

  const { quoteReference } = event.detail.data.request;

  const rateDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}/${quoteReference}-quote-${lenderId}.json`,
    data: JSON.stringify(lenderResponse.lenderRate),
  });

  const rateReceived = newLenderRateReceivedV1({
    context: {
      correlationId: event.detail.metadata.correlationId,
      requestId: event.detail.metadata.requestId,
    },
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.LenderGateway,
    },
    data:
      lenderResponse.resultType === 'SUCCEEDED'
        ? {
          payload: {
            lenderId,
            lenderRateDataUrl: rateDataUrl,
          },
          resultType: lenderResponse.resultType,
          taskToken: event.detail.data.taskToken,
        }
        : {
          error: 'Mock error',
          resultType: lenderResponse.resultType,
          taskToken: event.detail.data.taskToken,
        },
  });

  await putDomainEventAsync({
    eventBusName,
    domainEvent: rateReceived,
  });
};
