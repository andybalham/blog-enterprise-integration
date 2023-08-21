/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { getTestPropsAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  LOAN_BROKER_EVENT_BUS,
  CREDIT_BUREAU_DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';
import {
  CreditReportRequestedV1,
  EventDomain,
  EventService,
  newCreditReportReceivedV1,
} from '../../src/domain/domain-events';
import { CreditReport, QuoteRequest } from '../../src/domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../../src/lib/utils';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const dataBucketName = process.env[CREDIT_BUREAU_DATA_BUCKET_NAME];

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
  event: EventBridgeEvent<'CreditReportRequested', CreditReportRequestedV1>
): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    event.detail.data.request.quoteRequestDataUrl
  );

  console.log(JSON.stringify({ quoteRequest }, null, 2));

  const testProps = await getTestPropsAsync(documentClient);

  console.log(JSON.stringify({ testProps }, null, 2));

  const creditReportResultType = testProps.inputs?.creditReportResultType;
  const creditReport = testProps.inputs?.creditReport as CreditReport;

  if (creditReportResultType === 'FAILED') {
    // Don't return anything, let the task timeout
    return;
  }

  console.log(JSON.stringify({ creditReport }, null, 2));

  const { quoteReference } = event.detail.data.request;

  const creditReportDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}/${quoteReference}-credit-report.json`,
    data: JSON.stringify(creditReport),
  });

  const creditReportReceived = newCreditReportReceivedV1({
    context: {
      correlationId: event.detail.metadata.correlationId,
      requestId: event.detail.metadata.requestId,
    },
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
    },
    data: {
      resultType: creditReportResultType,
      taskToken: event.detail.data.taskToken,
      payload: {
        creditReportDataUrl,
      },
    },
  });

  console.log(JSON.stringify({ creditReportReceived }, null, 2));

  await putDomainEventAsync({
    eventBusName,
    domainEvent: creditReportReceived,
  });
};
