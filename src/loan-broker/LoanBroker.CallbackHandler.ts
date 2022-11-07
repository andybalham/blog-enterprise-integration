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

  if (event.detail.data.resultType === 'SUCCEEDED') {
    //
    const taskSuccessResponse = await stepFunctions
      .sendTaskSuccess({
        taskToken: event.detail.data.taskToken,
        // TODO 07Nov22: Should this be the whole event detail or just the response?
        output: JSON.stringify(event.detail),
        // output: JSON.stringify(event.detail.data.response),
      })
      .promise();

    console.log(JSON.stringify({ taskSuccessResponse }, null, 2));
    //
  } else {
    //
    const taskFailureResponse = await stepFunctions
      .sendTaskFailure({
        taskToken: event.detail.data.taskToken,
        error: event.detail.data.error,
      })
      .promise();

    console.log(
      JSON.stringify({ taskSuccessResponse: taskFailureResponse }, null, 2)
    );
  }
};
