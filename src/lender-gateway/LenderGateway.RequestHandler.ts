/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { EventBridgeEvent } from 'aws-lambda';
import {
  EventDetailType,
  EventDomain,
  EventService,
  LenderRateReceived,
  LenderRateRequested,
} from '../domain/domain-events';
import {
  CreditReport,
  LenderRate,
  QuoteRequest,
} from '../domain/domain-models';
import {
  fetchFromUrlAsync,
  getDataUrlAsync,
  putDomainEventAsync,
} from '../lib/utils';
import {
  APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME,
  LENDER_CONFIG,
} from './constants';
import { LenderConfig } from './LenderGateway';

const lenderConfigJson = process.env[LENDER_CONFIG];
const eventBusName = process.env[APPLICATION_EVENT_BUS_NAME];
const dataBucketName = process.env[DATA_BUCKET_NAME];

export const handler = async (
  event: EventBridgeEvent<'LenderRateRequested', LenderRateRequested>
): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (lenderConfigJson === undefined)
    throw new Error('lenderConfigJson === undefined');

  const lenderConfig: LenderConfig = JSON.parse(lenderConfigJson);

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    event.detail.data.request.quoteRequestDataUrl
  );
  const creditReport = await fetchFromUrlAsync<CreditReport>(
    event.detail.data.request.creditReportDataUrl
  );

  console.log(JSON.stringify({ quoteRequest }, null, 2));
  console.log(JSON.stringify({ creditReport }, null, 2));

  const { quoteReference } = event.detail.data.request;

  const isRateAvailable =
    (!creditReport.hasBankruptcies || lenderConfig.allowBankruptcies) &&
    (creditReport.onElectoralRoll || lenderConfig.allowNotOnElectoralRoll) &&
    (!lenderConfig.maximumAmount ||
      quoteRequest.loanDetails.amount <= lenderConfig.maximumAmount) &&
    (!lenderConfig.minimumTermMonths ||
      quoteRequest.loanDetails.termMonths >= lenderConfig.minimumTermMonths) &&
    (!lenderConfig.minimumCreditScore ||
      creditReport.creditScore >= lenderConfig.minimumCreditScore);

  const lenderRate: LenderRate = {
    lenderId: lenderConfig.lenderId,
    lenderName: lenderConfig.lenderName,
    rate: isRateAvailable ? lenderConfig.rate : undefined,
  };

  const lenderRateDataUrl = await getDataUrlAsync({
    bucketName: dataBucketName,
    key: `${quoteReference}/${quoteReference}-quote-${lenderConfig.lenderId}.json`,
    data: JSON.stringify(lenderRate),
  });

  const lenderRateReceived: LenderRateReceived = {
    metadata: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
      correlationId: event.detail.metadata.correlationId,
      requestId: event.detail.metadata.requestId,
    },
    data: {
      resultType: 'SUCCEEDED',
      taskToken: event.detail.data.taskToken,
      response: {
        lenderId: lenderConfig.lenderId,
        lenderRateDataUrl,
      },
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.LenderRateReceived,
    event: lenderRateReceived,
  });
};
