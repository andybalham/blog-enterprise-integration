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

export enum EventDetailType {
  QuoteSubmitted = 'QuoteSubmitted',
  QuoteProcessed = 'QuoteProcessed',
  CreditReportRequested = 'CreditReportRequested',
  CreditReportReceived = 'CreditReportReceived',
  LenderRateRequested = 'LenderRateRequested',
  LenderRateReceived = 'LenderRateReceived',
}

// https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface DomainEventMetadata {
  domain: EventDomain;
  service: EventService;
  correlationId: string;
  requestId: string;
  // TODO 02Oct22: Add requestTimestamp?
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

export type QuoteSubmitted = DomainEvent<{
  quoteReference: string;
  quoteRequestDataUrl: string;
}>;

export type QuoteProcessed = DomainEvent<{
  quoteReference: string;
  loanDetails: LoanDetails;
  bestLenderRate?: LenderRate;
}>;

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

export type CreditReportRequested = DomainEvent<
  AsyncRequest<{
    quoteReference: string;
    quoteRequestDataUrl: string;
  }>
>;

export type CreditReportReceived = DomainEvent<
  AsyncResponse<{
    creditReportDataUrl?: string;
  }>
>;

export type LenderRateRequested = DomainEvent<
  AsyncRequest<{
    lenderId: string;
    quoteReference: string;
    quoteRequestDataUrl: string;
    creditReportDataUrl: string;
  }>
>;

export type LenderRateReceived = DomainEvent<
  AsyncResponse<{
    lenderId: string;
    lenderRateDataUrl?: string;
  }>
>;
