import { QuoteSubmitted } from 'src/domain/domain-events';

export interface QuoteProcessorState {
  quoteSubmitted: QuoteSubmitted;
}
