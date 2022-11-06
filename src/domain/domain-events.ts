/* eslint-disable max-classes-per-file */
import { LoanDetails, LenderRate } from './domain-models';

export enum EventDomain {
  LoanBroker = 'LoanBroker',
}

export enum EventService {
  RequestApi = 'RequestApi',
  LoanBroker = 'LoanBroker',
  CreditBureau = 'CreditBureau',
  LenderGateway = 'LenderGateway',
}

export enum EventType {
  QuoteSubmitted = 'QuoteSubmitted',
  QuoteProcessed = 'QuoteProcessed',
  CreditReportRequested = 'CreditReportRequested',
  CreditReportReceived = 'CreditReportReceived',
  LenderRateRequested = 'LenderRateRequested',
  LenderRateReceived = 'LenderRateReceived',
}

// https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface EventSchema {
  eventType: EventType;
  eventVersion: string;
}

export interface EventOrigin {
  domain: EventDomain;
  service: EventService;
}

export interface EventContext {
  correlationId: string;
  requestId: string;
}

export interface DomainEventMetadata
  extends EventSchema,
    EventOrigin,
    EventContext {
  timestamp: Date;
}

export interface DomainEventBase {
  metadata: DomainEventMetadata;
  data: Record<string, any>;
}

export interface DomainEvent<TData extends Record<string, any>>
  extends DomainEventBase {
  metadata: DomainEventMetadata;
  data: TData;
}

export const newDomainEvent = <T extends Record<string, any>>({
  schema,
  origin,
  data,
  context,
}: {
  schema: EventSchema;
  origin: EventOrigin;
  data: T;
  context?: EventContext;
}): DomainEvent<T> => ({
    metadata: {
      ...schema,
      correlationId: context?.correlationId ?? crypto.randomUUID(),
      requestId: context?.requestId ?? crypto.randomUUID(),
      domain: origin.domain,
      service: origin.service,
      timestamp: new Date(),
    },
    data,
  });

export interface AsyncRequestBase {
  taskToken: string;
  request: Record<string, any>;
}

export interface AsyncRequest<T extends Record<string, any>>
  extends AsyncRequestBase {
  taskToken: string;
  request: T;
}

export interface AsyncResponseBase {
  resultType: 'SUCCEEDED' | 'FAILED';
  taskToken: string;
  response?: Record<string, any>;
}

export interface AsyncResponse<T extends Record<string, any>>
  extends AsyncResponseBase {
  taskToken: string;
  response?: T;
}

export type CallbackDomainEvent = DomainEvent<AsyncResponseBase>;

// QuoteSubmittedV1 ----------------------------------------

type QuoteSubmittedDataV1 = {
  quoteReference: string;
  quoteRequestDataUrl: string;
};

export type QuoteSubmittedV1 = DomainEvent<QuoteSubmittedDataV1>;

export const newQuoteSubmittedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: QuoteSubmittedDataV1;
  context?: EventContext;
}): QuoteSubmittedV1 =>
  newDomainEvent<QuoteSubmittedDataV1>({
    schema: {
      eventType: EventType.QuoteSubmitted,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// QuoteProcessedV1 ----------------------------------------

type QuoteProcessedDataV1 = {
  quoteReference: string;
  loanDetails: LoanDetails;
  bestLenderRate?: LenderRate;
};

export type QuoteProcessedV1 = DomainEvent<QuoteProcessedDataV1>;

export const newQuoteProcessedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: QuoteProcessedDataV1;
  context?: EventContext;
}): QuoteProcessedV1 =>
  newDomainEvent<QuoteProcessedDataV1>({
    schema: {
      eventType: EventType.QuoteProcessed,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// CreditReportRequestedV1 ----------------------------------------

type CreditReportRequestedDataV1 = AsyncRequest<{
  quoteReference: string;
  quoteRequestDataUrl: string;
}>;

export type CreditReportRequestedV1 = DomainEvent<CreditReportRequestedDataV1>;

export const newCreditReportRequestedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: CreditReportRequestedDataV1;
  context?: EventContext;
}): CreditReportRequestedV1 =>
  newDomainEvent<CreditReportRequestedDataV1>({
    schema: {
      eventType: EventType.CreditReportRequested,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// CreditReportReceivedV1 ----------------------------------------

type CreditReportReceivedDataV1 = AsyncResponse<{
  creditReportDataUrl?: string;
}>;

export type CreditReportReceivedV1 = DomainEvent<CreditReportReceivedDataV1>;

export const newCreditReportReceivedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: CreditReportReceivedDataV1;
  context?: EventContext;
}): CreditReportReceivedV1 =>
  newDomainEvent<CreditReportReceivedDataV1>({
    schema: {
      eventType: EventType.CreditReportReceived,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// LenderRateRequestedDataV1 ----------------------------------------

type LenderRateRequestedDataV1 = AsyncRequest<{
  lenderId: string;
  quoteReference: string;
  quoteRequestDataUrl: string;
  creditReportDataUrl: string;
}>;

export type LenderRateRequestedV1 = DomainEvent<LenderRateRequestedDataV1>;

export const newLenderRateRequestedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: LenderRateRequestedDataV1;
  context?: EventContext;
}): LenderRateRequestedV1 =>
  newDomainEvent<LenderRateRequestedDataV1>({
    schema: {
      eventType: EventType.LenderRateRequested,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// LenderRateReceivedDataV1 ----------------------------------------

type LenderRateReceivedDataV1 = AsyncResponse<{
  lenderId: string;
  lenderRateDataUrl?: string;
}>;

export type LenderRateReceivedV1 = DomainEvent<LenderRateReceivedDataV1>;

export const newLenderRateReceivedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: LenderRateReceivedDataV1;
  context?: EventContext;
}): LenderRateReceivedV1 =>
  newDomainEvent<LenderRateReceivedDataV1>({
    schema: {
      eventType: EventType.LenderRateReceived,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });
