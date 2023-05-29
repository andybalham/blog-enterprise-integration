/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { EventBridgeEvent } from 'aws-lambda';
// eslint-disable-next-line import/no-extraneous-dependencies
import AWS_StepFunctions, { SFN as StepFunctions } from '@aws-sdk/client-sfn';
import { QuoteSubmittedV1 } from '../domain/domain-events';
import { STATE_MACHINE_ARN } from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const stateMachineArn = process.env[STATE_MACHINE_ARN];
const stepFunctions = new StepFunctions({});

export const handler = async (
  event: EventBridgeEvent<'QuoteSubmitted', QuoteSubmittedV1>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (stateMachineArn === undefined)
    throw new Error('stateMachineArn === undefined');

  const loanBrokerState: LoanBrokerState = {
    quoteSubmitted: event.detail,
  };

  const params: AWS_StepFunctions.StartExecutionCommandInput = {
    stateMachineArn,
    input: JSON.stringify(loanBrokerState),
  };

  await stepFunctions.startExecution(params);
};
