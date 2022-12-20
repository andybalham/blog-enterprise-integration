/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import {
  DomainEventBase,
  EventType,
  QuoteProcessedV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';

const metrics = new Metrics({
  namespace: 'LoanBroker',
  serviceName: 'observer'
});

const publishQuoteSubmittedMetric = (
  quoteSubmitted: QuoteSubmittedV1
): void => {
  metrics.addMetric('quoteSubmitted', MetricUnits.Count, 1);
  metrics.addMetadata('requestId', quoteSubmitted.metadata.requestId);
  metrics.addMetadata('correlationId', quoteSubmitted.metadata.correlationId);
  metrics.addMetadata('quoteReference', quoteSubmitted.data.quoteReference);
};

const publishQuoteProcessedMetric = (
  quoteProcessed: QuoteProcessedV1
): void => {
  metrics.addMetric('quoteProcessed', MetricUnits.Count, 1);
  metrics.addMetadata('requestId', quoteProcessed.metadata.requestId);
  metrics.addMetadata('correlationId', quoteProcessed.metadata.correlationId);
  metrics.addMetadata('quoteReference', quoteProcessed.data.quoteReference);
  metrics.addMetadata(
    'bestLenderRate',
    quoteProcessed.data.bestLenderRate?.toString() ?? ''
  );
  metrics.addMetadata(
    'loanDetailsAmount',
    quoteProcessed.data.loanDetails.amount?.toString() ?? ''
  );
  metrics.addMetadata(
    'loanDetailsTermMonths',
    quoteProcessed.data.loanDetails.termMonths?.toString() ?? ''
  );
};

/* eslint-disable no-console */
export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  //
  switch (event.detail.metadata.eventType) {
    // TODO 20Dec22: What metrics do we want to log?
    case EventType.QuoteSubmitted:
      publishQuoteSubmittedMetric(event.detail as QuoteSubmittedV1);
      break;
    case EventType.QuoteProcessed:
      publishQuoteProcessedMetric(event.detail as QuoteProcessedV1);
      break;
    default:
      // Do nothing
      break;
  }

  metrics.publishStoredMetrics();
};
