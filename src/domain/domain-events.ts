/* eslint-disable max-classes-per-file */

import { LoanDetails, QuoteResponse } from './domain-models';

export enum EventDomain {
  LoanBroker = 'LoanBroker',
}

export enum EventService {
  RequestApi = 'RequestApi',
  CreditBureau = 'CreditBureau',
}

export enum EventDetailType {
  QuoteSubmitted = 'QuoteSubmitted',
  QuoteProcessed = 'QuoteProcessed',
  CreditReportRequested = 'CreditReportRequested',
  CreditReportReceived = 'CreditReportReceived',
}

// TODO 04Sep22: Look at https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface DomainEventMetadata {
  domain: EventDomain;
  service: EventService;
  correlationId: string;
  requestId: string;
}

export interface DomainEvent<TData> {
  metadata: DomainEventMetadata;
  data: TData;
}

export type QuoteSubmitted = DomainEvent<{
  quoteReference: string;
  quoteRequestDataUrl: string;
}>;

export type QuoteProcessed = DomainEvent<{
  quoteReference: string;
  quoteResponse: QuoteResponse;
  loanDetails: LoanDetails;
}>;

export type CreditReportRequested = DomainEvent<{
  quoteReference: string;
  quoteRequestDataUrl: string;
}>;

export type CreditReportReceived = DomainEvent<{
  creditReportDataUrl?: string;
  isFailure: boolean;
}>;
