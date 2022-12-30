/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import {
  DomainEventBase,
  EventType,
  LenderRateReceivedV1,
  LenderRateRequestedV1,
  QuoteProcessedV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';

const metrics = new Metrics({
  namespace: 'LoanBrokerPT',
  serviceName: 'observer',
});

const addMetadata = (
  domainEvent: DomainEventBase,
  metadata?: Record<string, string | undefined>
): void => {
  metrics.addMetadata('requestId', domainEvent.metadata.requestId);
  metrics.addMetadata('correlationId', domainEvent.metadata.correlationId);

  // eslint-disable-next-line no-restricted-syntax
  for (const key in metadata) {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      const value = metadata[key];
      metrics.addMetadata(key, value ?? '');
    }
  }
};

const publishQuoteSubmittedMetric = (
  quoteSubmitted: QuoteSubmittedV1
): void => {
  metrics.addMetric('quoteSubmitted', MetricUnits.Count, 1);

  addMetadata(quoteSubmitted, {
    quoteReference: quoteSubmitted.data.quoteReference,
  });

  metrics.publishStoredMetrics();
};

const publishLenderRateReceivedMetric = (
  lenderRateReceived: LenderRateReceivedV1
): void => {
  if (
    lenderRateReceived.data.resultType === 'SUCCEEDED' &&
    lenderRateReceived.data.payload.isRateAvailable
  ) {
    metrics.addMetric('lenderRateReceived', MetricUnits.Count, 1);

    addMetadata(lenderRateReceived, {
      lenderId: lenderRateReceived.data.payload.lenderId,
      isRateAvailable:
        lenderRateReceived.data.payload.isRateAvailable.toString(),
    });

    metrics.publishStoredMetrics();

    // ----------------------------------------------------------------------

    metrics.addDimension('lenderId', lenderRateReceived.data.payload.lenderId);
    metrics.addMetric('lenderRateReceivedByLender', MetricUnits.Count, 1);

    addMetadata(lenderRateReceived, {
      isRateAvailable:
        lenderRateReceived.data.payload.isRateAvailable.toString(),
    });

    metrics.publishStoredMetrics();
  }
};

const publishLenderRateRequestedMetric = (
  lenderRateRequested: LenderRateRequestedV1
): void => {
  //
  metrics.addMetric('lenderRateRequested', MetricUnits.Count, 1);

  addMetadata(lenderRateRequested, {
    lenderId: lenderRateRequested.data.request.lenderId,
  });

  metrics.publishStoredMetrics();

  // ----------------------------------------------------------------------

  metrics.addDimension('lenderId', lenderRateRequested.data.request.lenderId);
  metrics.addMetric('lenderRateRequestedByLender', MetricUnits.Count, 1);

  addMetadata(lenderRateRequested);

  metrics.publishStoredMetrics();
};

const publishQuoteProcessedMetric = (
  quoteProcessed: QuoteProcessedV1
): void => {
  metrics.addMetric('quoteProcessed', MetricUnits.Count, 1);

  addMetadata(quoteProcessed, {
    quoteReference: quoteProcessed.data.quoteReference,
    bestLenderRate: quoteProcessed.data.bestLenderRate?.toString(),
    loanDetailsAmount: quoteProcessed.data.loanDetails.amount?.toString(),
    loanDetailsTermMonths:
      quoteProcessed.data.loanDetails.termMonths?.toString(),
  });

  metrics.publishStoredMetrics();
};

export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  //
  switch (event.detail.metadata.eventType) {
    // TODO 20Dec22: Add failure events and alarms
    case EventType.QuoteSubmitted:
      publishQuoteSubmittedMetric(event.detail as QuoteSubmittedV1);
      break;
    case EventType.QuoteProcessed:
      // TODO 30Dec22: Add overall time for processing
      publishQuoteProcessedMetric(event.detail as QuoteProcessedV1);
      break;
    case EventType.LenderRateRequested:
      publishLenderRateRequestedMetric(event.detail as LenderRateRequestedV1);
      break;
    case EventType.LenderRateReceived:
      publishLenderRateReceivedMetric(event.detail as LenderRateReceivedV1);
      break;
    default:
      // Do nothing
      break;
  }
};
