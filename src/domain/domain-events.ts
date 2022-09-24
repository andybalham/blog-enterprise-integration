/* eslint-disable max-classes-per-file */

import { LoanDetails, QuoteResponse } from './domain-models';

export enum EventDomain {
  LoanBroker = 'LoanBroker',
}

export enum EventService {
  RequestApi = 'RequestApi',
}

export enum EventDetailType {
  QuoteSubmitted = 'QuoteSubmitted',
  QuoteProcessed = 'QuoteProcessed',
}

// TODO 04Sep22: Look at https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface DomainEvent<TData> {
  metadata: {
    correlationId: string;
    requestId: string;
    service: EventService;
    domain: EventDomain;
  };
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
