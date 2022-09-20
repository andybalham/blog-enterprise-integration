/* eslint-disable max-classes-per-file */

export class EventDomain {
  static readonly LoanBroker = 'LoanBroker';
}

export class EventService {
  static readonly RequestApi = 'RequestApi';
}

export class EventDetailType {
  static readonly QuoteSubmitted = 'QuoteSubmitted';
}

// TODO 04Sep22: Look at https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface DomainEvent<TData> {
  metadata: {
    correlationId: string;
    requestId: string;
    service: string;
    domain: string;
  };
  data: TData;
}

export type QuoteSubmitted = DomainEvent<{
  quoteReference: string;
  quoteRequestDataUrl: string;
}>;

export type QuoteProcessed = DomainEvent<{
  quoteReference: string;
  quoteResponseDataUrl: string;
}>;
