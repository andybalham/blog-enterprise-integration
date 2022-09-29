/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { getTestPropsAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
  APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';
import {
  CreditReportReceived,
  EventDetailType,
  EventDomain,
  EventService,
} from '../../src/domain/domain-events';
import { CreditReport } from '../../src/domain/domain-models';
import { getDataUrlAsync, putDomainEventAsync } from '../../src/lib/utils';

const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];
const dataBucketName = process.env[DATA_BUCKET_NAME];

const documentClient = new DocumentClient();

export const handler = async (event: Record<string, any>): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const testProps = await getTestPropsAsync(documentClient);

  console.log(JSON.stringify({ testProps }, null, 2));

  const creditReportResultType = testProps.inputs?.creditReportResultType;
  const creditReport = testProps.inputs?.creditReport as CreditReport;

  if (creditReport === undefined) throw new Error('creditReport === undefined');

  console.log(JSON.stringify({ creditReport }, null, 2));

  const creditReportDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${event.detail.data.quoteReference}/${event.detail.data.quoteReference}-credit-report.json`,
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
      creditReportDataUrl,
    },
  };

  console.log(JSON.stringify({ creditReportReceived }, null, 2));

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportReceived,
    event: creditReportReceived,
  });
};
