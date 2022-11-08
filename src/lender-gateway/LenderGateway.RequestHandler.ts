/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda';
import {
  EventDomain,
  EventService,
  LenderRateRequestedV1,
  newLenderRateReceivedV1,
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
  LOAN_BROKER_EVENT_BUS,
  LENDER_GATEWAY_DATA_BUCKET_NAME,
  LENDER_CONFIG,
} from './constants';
import { LenderConfig } from './LenderGateway';

const lenderConfigJson = process.env[LENDER_CONFIG];
const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const dataBucketName = process.env[LENDER_GATEWAY_DATA_BUCKET_NAME];

export const handler = async (
  event: EventBridgeEvent<'LenderRateRequested', LenderRateRequestedV1>
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
    key: `${quoteReference}-quote-${lenderConfig.lenderId}.json`,
    data: JSON.stringify(lenderRate),
  });

  const lenderRateReceived = newLenderRateReceivedV1({
    context: event.detail.metadata,
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.CreditBureau,
    },
    data: {
      resultType: 'SUCCEEDED',
      taskToken: event.detail.data.taskToken,
      payload: {
        lenderId: lenderConfig.lenderId,
        lenderRateDataUrl,
      },
    },
  });

  await putDomainEventAsync({
    eventBusName,
    domainEvent: lenderRateReceived,
  });
};
