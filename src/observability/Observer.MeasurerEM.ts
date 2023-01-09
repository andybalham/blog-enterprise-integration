/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';
import {
  DomainEventBase,
  EventType,
  LenderRateReceivedV1,
  LenderRateRequestedV1,
  QuoteProcessedV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';

const metrics = createMetricsLogger();
metrics.setNamespace('LoanBrokerEM');

const addCorrelationMetadata = (domainEvent: DomainEventBase): void => {
  metrics.setProperty('requestId', domainEvent.metadata.requestId);
  metrics.setProperty('correlationId', domainEvent.metadata.correlationId);
};

const publishQuoteSubmittedMetric = (
  quoteSubmitted: QuoteSubmittedV1
): void => {
  metrics.putMetric('quoteSubmitted', 1, Unit.Count);

  addCorrelationMetadata(quoteSubmitted);

  metrics.setProperty('quoteReference', quoteSubmitted.data.quoteReference);

  metrics.flush();
};

const publishLenderRateReceivedMetric = (
  lenderRateReceived: LenderRateReceivedV1
): void => {
  if (
    lenderRateReceived.data.resultType === 'SUCCEEDED' &&
    lenderRateReceived.data.payload.isRateAvailable
  ) {
    //
    metrics.putMetric('lenderRateReceived', 1, Unit.Count);

    addCorrelationMetadata(lenderRateReceived);

    metrics.setProperty('lenderId', lenderRateReceived.data.payload.lenderId);
    metrics.setProperty(
      'isRateAvailable',
      lenderRateReceived.data.payload.isRateAvailable.toString()
    );

    metrics.flush();

    // ----------------------------------------------------------------------

    metrics.setDimensions({
      lenderId: lenderRateReceived.data.payload.lenderId,
    });
    metrics.putMetric('lenderRateReceivedByLender', 1, Unit.Count);

    addCorrelationMetadata(lenderRateReceived);

    metrics.setProperty(
      'isRateAvailable',
      lenderRateReceived.data.payload.isRateAvailable.toString()
    );

    metrics.flush();
  }
};

const publishLenderRateRequestedMetric = (
  lenderRateRequested: LenderRateRequestedV1
): void => {
  //
  metrics.putMetric('lenderRateRequested', 1, Unit.Count);

  addCorrelationMetadata(lenderRateRequested);

  metrics.setProperty('lenderId', lenderRateRequested.data.request.lenderId);

  metrics.flush();

  // ----------------------------------------------------------------------

  metrics.setDimensions({
    lenderId: lenderRateRequested.data.request.lenderId,
  });
  metrics.putMetric('lenderRateRequestedByLender', 1, Unit.Count);

  addCorrelationMetadata(lenderRateRequested);

  metrics.flush();
};

const publishQuoteProcessedMetric = (
  quoteProcessed: QuoteProcessedV1
): void => {
  metrics.putMetric('quoteProcessed', 1, Unit.Count);

  addCorrelationMetadata(quoteProcessed);

  metrics.setProperty('quoteReference', quoteProcessed.data.quoteReference);
  metrics.setProperty(
    'bestLenderRate',
    quoteProcessed.data.bestLenderRate?.toString() ?? ''
  );
  metrics.setProperty(
    'loanDetailsAmount',
    quoteProcessed.data.loanDetails.amount?.toString() ?? ''
  );
  metrics.setProperty(
    'loanDetailsTermMonths',
    quoteProcessed.data.loanDetails.termMonths?.toString() ?? ''
  );

  metrics.flush();
};

export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  //
  switch (event.detail.metadata.eventType) {
    // TODO 20Dec22: What other metrics do we want to log?
    case EventType.QuoteSubmitted:
      publishQuoteSubmittedMetric(event.detail as QuoteSubmittedV1);
      break;
    case EventType.QuoteProcessed:
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
