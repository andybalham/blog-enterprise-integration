/* eslint-disable max-classes-per-file */
import { v4 as uuidv4 } from 'uuid';
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
  CreditReportFailed = 'CreditReportFailed',
  LenderRateRequested = 'LenderRateRequested',
  LenderRateReceived = 'LenderRateReceived',
}

// https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface EventSchema {
  readonly eventType: EventType;
  readonly eventVersion: string;
}

export interface EventOrigin {
  readonly domain: EventDomain;
  readonly service: EventService;
}

export interface EventContext {
  readonly correlationId: string;
  readonly requestId: string;
}

export interface DomainEventMetadata
  extends EventSchema,
    EventOrigin,
    EventContext {
  readonly timestamp: Date;
}

export interface DomainEventBase {
  readonly metadata: DomainEventMetadata;
  readonly data: Record<string, any>;
}

export interface DomainEvent<TData extends Record<string, any>>
  extends DomainEventBase {
  readonly metadata: DomainEventMetadata;
  readonly data: TData;
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
      correlationId: context?.correlationId ?? uuidv4(),
      requestId: context?.requestId ?? uuidv4(),
      domain: origin.domain,
      service: origin.service,
      timestamp: new Date(),
    },
    data,
  });

export interface AsyncRequestBase {
  readonly taskToken: string;
  readonly request: Record<string, any>;
}

export interface AsyncRequest<T extends Record<string, any>>
  extends AsyncRequestBase {
  readonly taskToken: string;
  readonly request: T;
}

type AsyncResponseSucceededBase = {
  readonly resultType: 'SUCCEEDED';
  readonly taskToken: string;
  readonly payload: Record<string, any>;
};

interface AsyncResponseSucceeded<T extends Record<string, any>>
  extends AsyncResponseSucceededBase {
  readonly payload: T;
}

type AsyncResponseFailed = {
  readonly resultType: 'FAILED';
  readonly taskToken: string;
  readonly error: string;
};

export type AsyncResponseBase =
  | AsyncResponseSucceededBase
  | AsyncResponseFailed;

export type CallbackDomainEvent = DomainEvent<AsyncResponseBase>;

export type AsyncResponse<T extends Record<string, any>> =
  | AsyncResponseSucceeded<T>
  | AsyncResponseFailed;

// QuoteSubmittedV1 ----------------------------------------

export type QuoteSubmittedDataV1 = {
  readonly quoteReference: string;
  readonly quoteRequestDataUrl: string;
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

export type QuoteProcessedDataV1 = {
  readonly quoteReference: string;
  readonly loanDetails: LoanDetails;
  readonly bestLenderRate?: LenderRate;
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

export type CreditReportRequestedDataV1 = AsyncRequest<{
  readonly quoteReference: string;
  readonly quoteRequestDataUrl: string;
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

export type CreditReportReceivedDataV1 = AsyncResponse<{
  readonly creditReportDataUrl: string;
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

// CreditReportFailedV1 ----------------------------------------

export type CreditReportFailedDataV1 = {
  readonly quoteReference: string;
  readonly stateMachineId: string;
  readonly executionId: string;
  readonly executionStartTime: string;
};

export type CreditReportFailedV1 = DomainEvent<CreditReportFailedDataV1>;

export const newCreditReportFailedV1 = ({
  origin,
  data,
  context,
}: {
  origin: EventOrigin;
  data: CreditReportFailedDataV1;
  context?: EventContext;
}): CreditReportFailedV1 =>
  newDomainEvent<CreditReportFailedDataV1>({
    schema: {
      eventType: EventType.CreditReportFailed,
      eventVersion: '1.0',
    },
    origin,
    data,
    context,
  });

// LenderRateRequestedDataV1 ----------------------------------------

export type LenderRateRequestedDataV1 = AsyncRequest<{
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

export type LenderRateReceivedDataV1 = AsyncResponse<{
  readonly lenderId: string;
  readonly isRateAvailable: boolean;
  readonly lenderRateDataUrl: string;
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
