/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
import AWS_S3, { S3 } from '@aws-sdk/client-s3';
import {
  EventDomain,
  EventService,
  newQuoteProcessedV1,
} from '../domain/domain-events';
import { LenderRate, QuoteRequest } from '../domain/domain-models';
import { fetchFromUrlAsync, putDomainEventAsync } from '../lib/utils';
import {
  LOAN_BROKER_EVENT_BUS,
  LOAN_BROKER_DATA_BUCKET_NAME,
} from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const bucketName = process.env[LOAN_BROKER_DATA_BUCKET_NAME];

const s3 = new S3({});

// eslint-disable-next-line import/prefer-default-export
export const handler = async (
  state: LoanBrokerState
): Promise<LoanBrokerState> => {
  console.log(JSON.stringify({ state }, null, 2));

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    state.quoteSubmitted.data.quoteRequestDataUrl
  );

  // TODO 08Nov22: Report about failed quotes

  const lenderRatePromises =
    state.lenderRatesReceivedData?.map(async (lrr) =>
      lrr.resultType === 'SUCCEEDED'
        ? fetchFromUrlAsync<LenderRate>(lrr.payload.lenderRateDataUrl)
        : undefined
    ) ?? [];

  const lenderRatePromiseResults = await Promise.allSettled(lenderRatePromises);

  const lenderRates = (
    lenderRatePromiseResults.filter(
      (r) => r.status === 'fulfilled' && r.value
    ) as PromiseFulfilledResult<LenderRate>[]
  ).map((r) => r.value);

  console.log(JSON.stringify({ lenderRates }, null, 2));

  const bestLenderRate = lenderRates
    .filter((lr) => lr.rate !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .reduce((lr1, lr2) => (lr1.rate! < lr2.rate! ? lr1 : lr2));

  // eslint-disable-next-line no-param-reassign
  state.bestLenderRate = bestLenderRate;

  await s3.putObject({
    Bucket: bucketName,
    Key: `${state.quoteSubmitted.data.quoteReference}-best-rate.json`,
    Body: JSON.stringify({ bestLenderRate }),
  } as AWS_S3.PutObjectCommandInput);

  const quoteProcessed = newQuoteProcessedV1({
    context: state.quoteSubmitted.metadata,
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.LoanBroker,
    },
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      loanDetails: quoteRequest.loanDetails,
      bestLenderRate,
    },
  });

  await putDomainEventAsync({
    eventBusName,
    domainEvent: quoteProcessed,
  });

  console.log(JSON.stringify({ quoteProcessed }, null, 2));

  return state;
};
