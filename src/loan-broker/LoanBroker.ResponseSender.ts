/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import S3, { PutObjectRequest } from 'aws-sdk/clients/s3';
import { EventDetailType, QuoteProcessed } from '../domain/domain-events';
import { LenderRate, QuoteRequest } from '../domain/domain-models';
import { fetchFromUrlAsync, putDomainEventAsync } from '../lib/utils';
import {
  LOAN_BROKER_EVENT_BUS,
  LOAN_BROKER_DATA_BUCKET_NAME,
} from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];
const bucketName = process.env[LOAN_BROKER_DATA_BUCKET_NAME];

const s3 = new S3();

export const handler = async (
  state: LoanBrokerState
): Promise<LoanBrokerState> => {
  console.log(JSON.stringify({ state }, null, 2));

  const quoteRequest = await fetchFromUrlAsync<QuoteRequest>(
    state.quoteSubmitted.data.quoteRequestDataUrl
  );

  const lenderRatePromises =
    state.lenderRatesReceived
      ?.filter((lrr) => lrr.data.response?.lenderRateDataUrl)
      .map(async (lrr) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        fetchFromUrlAsync<LenderRate>(lrr.data.response!.lenderRateDataUrl!)
      ) ?? [];

  const lenderRatePromiseResults = await Promise.allSettled(lenderRatePromises);

  const lenderRates = (
    lenderRatePromiseResults.filter(
      (r) => r.status === 'fulfilled'
    ) as PromiseFulfilledResult<LenderRate>[]
  ).map((r) => r.value);

  console.log(JSON.stringify({ lenderRates }, null, 2));

  const bestLenderRate = lenderRates
    .filter((lr) => lr.rate !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .reduce((lr1, lr2) => (lr1.rate! < lr2.rate! ? lr1 : lr2));

  // eslint-disable-next-line no-param-reassign
  state.bestLenderRate = bestLenderRate;

  await s3
    .putObject({
      Bucket: bucketName,
      Key: `${state.quoteSubmitted.data.quoteReference}-best-rate.json`,
      Body: JSON.stringify({ bestLenderRate }),
    } as PutObjectRequest)
    .promise();

  const quoteProcessed: QuoteProcessed = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      quoteReference: state.quoteSubmitted.data.quoteReference,
      loanDetails: quoteRequest.loanDetails,
      bestLenderRate,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.QuoteProcessed,
    event: quoteProcessed,
  });

  console.log(JSON.stringify({ quoteProcessed }, null, 2));

  return state;
};
