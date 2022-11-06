/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { EventBridgeEvent } from 'aws-lambda';
import StepFunctions, {
  StartExecutionInput,
} from 'aws-sdk/clients/stepfunctions';
import { QuoteSubmittedV1 } from '../domain/domain-events';
import { STATE_MACHINE_ARN } from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const stateMachineArn = process.env[STATE_MACHINE_ARN];
const stepFunctions = new StepFunctions();

export const handler = async (
  event: EventBridgeEvent<'QuoteSubmitted', QuoteSubmittedV1>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (stateMachineArn === undefined)
    throw new Error('stateMachineArn === undefined');

  const loanBrokerState: LoanBrokerState = {
    quoteSubmitted: event.detail,
  };

  const params: StartExecutionInput = {
    stateMachineArn,
    input: JSON.stringify(loanBrokerState),
  };

  await stepFunctions.startExecution(params).promise();
};
