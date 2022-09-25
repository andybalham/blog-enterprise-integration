/* eslint-disable import/prefer-default-export */

import { S3TestClient } from '@andybalham/cdk-cloud-test-kit';
import {
  EventDomain,
  EventService,
  QuoteSubmitted,
} from '../../src/domain/domain-events';
import { QuoteRequest } from '../../src/domain/domain-models';
import { getDataUrlAsync } from '../../src/lib/utils';

export const getQuoteSubmittedEvent = async (
  dataBucket: S3TestClient,
  quoteRequest: QuoteRequest
): Promise<QuoteSubmitted> => {
  //
  const quoteRequestDataUrl = await getDataUrlAsync({
    bucketName: dataBucket.bucketName,
    key: 'test-quote-request',
    data: JSON.stringify(quoteRequest),
    expirySeconds: 5 * 60,
  });

  const quoteSubmitted: QuoteSubmitted = {
    metadata: {
      correlationId: 'test-correlationId',
      requestId: 'test-requestId',
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      quoteReference: 'test-quoteReference',
      quoteRequestDataUrl,
    },
  };

  return quoteSubmitted;
};
