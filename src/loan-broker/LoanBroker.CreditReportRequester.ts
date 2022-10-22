/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */

import {
  EventDetailType,
  CreditReportRequested,
} from '../domain/domain-events';
import { putDomainEventAsync } from '../lib/utils';
import { LOAN_BROKER_EVENT_BUS } from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const eventBusName = process.env[LOAN_BROKER_EVENT_BUS];

export const handler = async (event: Record<string, any>): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  const state = event.state as LoanBrokerState;

  const creditReportRequested: CreditReportRequested = {
    metadata: state.quoteSubmitted.metadata,
    data: {
      request: {
        quoteReference: state.quoteSubmitted.data.quoteReference,
        quoteRequestDataUrl: state.quoteSubmitted.data.quoteRequestDataUrl,
      },
      taskToken: event.taskToken,
    },
  };

  await putDomainEventAsync({
    eventBusName,
    detailType: EventDetailType.CreditReportRequested,
    event: creditReportRequested,
  });
};
