/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import {
  EventDomain,
  EventService,
  newCreditReportRequestedV1,
} from '../domain/domain-events';
import { putDomainEventAsync } from '../lib/utils';
import { LOAN_BROKER_EVENT_BUS } from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];

export const handler = async (event: Record<string, any>): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const state = event.state as LoanBrokerState;

  const creditReportRequested = newCreditReportRequestedV1({
    origin: {
      domain: EventDomain.LoanBroker,
      service: EventService.LoanBroker,
    },
    data: {
      request: {
        quoteReference: state.quoteSubmitted.data.quoteReference,
        quoteRequestDataUrl: state.quoteSubmitted.data.quoteRequestDataUrl,
      },
      taskToken: event.taskToken,
    },
    context: state.quoteSubmitted.metadata,
  });

  await putDomainEventAsync({
    eventBusName,
    domainEvent: creditReportRequested,
  });
};
