/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { EventBridgeEvent } from 'aws-lambda';
import StepFunctions, {
  StartExecutionInput,
} from 'aws-sdk/clients/stepfunctions';
import { QuoteSubmitted } from '../domain/domain-events';
import { STATE_MACHINE_ARN } from './constants';
import { QuoteProcessorState } from './QuoteProcessorState';

const stateMachineArn = process.env[STATE_MACHINE_ARN];
const stepFunctions = new StepFunctions();

export const handler = async (
  event: EventBridgeEvent<'QuoteSubmitted', QuoteSubmitted>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (stateMachineArn === undefined)
    throw new Error('stateMachineArn === undefined');

  const quoteProcessorState: QuoteProcessorState = {
    quoteSubmitted: event.detail,
  };

  const params: StartExecutionInput = {
    stateMachineArn,
    input: JSON.stringify(quoteProcessorState),
  };

  await stepFunctions.startExecution(params).promise();
};
