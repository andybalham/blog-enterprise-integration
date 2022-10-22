/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { EventBridgeEvent } from 'aws-lambda';
import { StepFunctions } from 'aws-sdk';
import { CallbackDomainEvent } from '../domain/domain-events';

const stepFunctions = new StepFunctions();

export const handler = async (
  event: EventBridgeEvent<'CallbackDomainEvent', CallbackDomainEvent>
): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  // TODO 29Sep22: What about when the response should be an error?

  const taskSuccessResponse = await stepFunctions
    .sendTaskSuccess({
      taskToken: event.detail.data.taskToken,
      output: JSON.stringify(event.detail),
    })
    .promise();

  console.log(JSON.stringify({ taskSuccessResponse }, null, 2));
};
