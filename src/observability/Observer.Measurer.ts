/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { DateTime } from 'luxon';
import {
  CreditReportFailedV1,
  DomainEventBase,
  EventType,
  LenderRateFailedV1,
  LenderRateReceivedV1,
  LenderRateRequestedV1,
  QuoteProcessedV1,
  QuoteSubmittedV1,
} from '../domain/domain-events';
import RequestEventTableClient from './RequestEventTableClient';

const requestEventTableClient = new RequestEventTableClient();

export const METRICS_NAMESPACE = 'LoanBrokerPT';
export const METRICS_SERVICE_NAME = 'observer';

export const CREDIT_REPORT_FAILED_METRIC = 'creditReportFailed';

const metrics = new Metrics({
  namespace: METRICS_NAMESPACE,
  serviceName: METRICS_SERVICE_NAME,
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

const publishQuoteSubmittedMetrics = (
  quoteSubmitted: QuoteSubmittedV1
): void => {
  metrics.addMetric('quoteSubmitted', MetricUnits.Count, 1);

  addMetadata(quoteSubmitted, {
    quoteReference: quoteSubmitted.data.quoteReference,
  });

  metrics.publishStoredMetrics();
};

const publishLenderRateReceivedMetrics = (
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

const publishLenderRateFailedMetrics = (
  lenderRateFailed: LenderRateFailedV1
): void => {
  metrics.addMetric('lenderRateFailed', MetricUnits.Count, 1);

  addMetadata(lenderRateFailed, {
    quoteReference: lenderRateFailed.data.quoteReference,
    error: lenderRateFailed.data.error,
    executionId: lenderRateFailed.data.executionId,
    executionStartTime: lenderRateFailed.data.executionStartTime,
    stateMachineId: lenderRateFailed.data.stateMachineId,
  });

  metrics.publishStoredMetrics();
};

const publishCreditReportFailedMetrics = (
  creditReportFailed: CreditReportFailedV1
): void => {
  metrics.addMetric(CREDIT_REPORT_FAILED_METRIC, MetricUnits.Count, 1);

  addMetadata(creditReportFailed, {
    quoteReference: creditReportFailed.data.quoteReference,
    error: creditReportFailed.data.error,
    executionId: creditReportFailed.data.executionId,
    executionStartTime: creditReportFailed.data.executionStartTime,
    stateMachineId: creditReportFailed.data.stateMachineId,
  });

  metrics.publishStoredMetrics();
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

const publishQuoteProcessedMetricsAsync = async (
  quoteProcessed: QuoteProcessedV1
): Promise<void> => {
  //
  metrics.addMetric('quoteProcessed', MetricUnits.Count, 1);

  addMetadata(quoteProcessed, {
    quoteReference: quoteProcessed.data.quoteReference,
  });

  metrics.publishStoredMetrics();

  //---------------------------------------------------

  const [quoteSubmitted] = await requestEventTableClient.getEventsByType(
    quoteProcessed.metadata.requestId,
    EventType.QuoteSubmitted
  );

  if (!quoteSubmitted) {
    return;
  }

  const quoteSubmittedMillis = DateTime.fromISO(
    quoteSubmitted.metadata.timestamp
  ).toMillis();
  const quoteProcessedMillis = DateTime.fromISO(
    quoteProcessed.metadata.timestamp
  ).toMillis();

  const durationMillis = quoteProcessedMillis - quoteSubmittedMillis;

  metrics.addMetric(
    'quoteProcessedDuration',
    MetricUnits.Milliseconds,
    durationMillis
  );

  addMetadata(quoteProcessed, {
    quoteReference: quoteProcessed.data.quoteReference,
  });

  metrics.publishStoredMetrics();
};

export const handler = async (
  event: EventBridgeEvent<'DomainEventBase', DomainEventBase>
): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  let isEventHandled = true;

  switch (event.detail.metadata.eventType) {
    // TODO 20Dec22: Add failure events and alarms
    case EventType.QuoteSubmitted:
      publishQuoteSubmittedMetrics(event.detail as QuoteSubmittedV1);
      break;
    case EventType.QuoteProcessed:
      // TODO 30Dec22: Add overall time for processing
      await publishQuoteProcessedMetricsAsync(event.detail as QuoteProcessedV1);
      break;
    case EventType.LenderRateRequested:
      publishLenderRateRequestedMetric(event.detail as LenderRateRequestedV1);
      break;
    case EventType.LenderRateReceived:
      publishLenderRateReceivedMetrics(event.detail as LenderRateReceivedV1);
      break;
    case EventType.LenderRateFailed:
      publishLenderRateFailedMetrics(event.detail as LenderRateFailedV1);
      break;
    case EventType.CreditReportFailed:
      publishCreditReportFailedMetrics(event.detail as CreditReportFailedV1);
      break;
    default:
      // Do nothing
      isEventHandled = false;
      break;
  }

  console.log(JSON.stringify({ isEventHandled }, null, 2));
};
