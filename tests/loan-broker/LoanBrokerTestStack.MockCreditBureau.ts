/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { getTestPropsAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { EventBridgeEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
  LOAN_BROKER_EVENT_BUS,
  CREDIT_BUREAU_DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';
import {
  CreditReportReceived,
  CreditReportRequested,
  EventDetailType,
  EventDomain,
  EventService,
} from '../../src/domain/domain-events';
import { CreditReport, QuoteRequest } from '../../src/domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../../src/lib/utils';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const dataBucketName = process.env[CREDIT_BUREAU_DATA_BUCKET_NAME];

const documentClient = new DocumentClient();

export const handler = async (
  event: EventBridgeEvent<'CreditReportRequested', CreditReportRequested>
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

  if (creditReport === undefined) throw new Error('creditReport === undefined');

  console.log(JSON.stringify({ creditReport }, null, 2));

  const { quoteReference } = event.detail.data.request;

  const creditReportDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}/${quoteReference}-credit-report.json`,
    data: JSON.stringify(creditReport),
  });

  const creditReportReceived: CreditReportReceived = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
      correlationId: event.detail.metadata.correlationId,
      requestId: event.detail.metadata.requestId,
    },
    data: {
      resultType: creditReportResultType,
      taskToken: event.detail.data.taskToken,
      response: {
        creditReportDataUrl,
      },
    },
  };

  console.log(JSON.stringify({ creditReportReceived }, null, 2));

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportReceived,
    event: creditReportReceived,
  });
};
