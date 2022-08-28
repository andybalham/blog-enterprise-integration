/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { APIGatewayEvent } from 'aws-lambda';
import SNS, { PublishInput } from 'aws-sdk/clients/sns';
import StepFunctions from 'aws-sdk/clients/stepfunctions';
import TaskTokenStore from './TaskTokenStore';
import { ValuationResponse } from './valuation-service/ValuationResponse';

export class ValuationCallbackFunctionEnv {
  static readonly TASK_TOKEN_TABLE_NAME = 'TASK_TOKEN_TABLE_NAME';

  static readonly ERROR_TOPIC_ARN = 'ERROR_TOPIC_ARN';
}

const taskTokenStore = new TaskTokenStore(
  process.env[ValuationCallbackFunctionEnv.TASK_TOKEN_TABLE_NAME]
);

const errorTopicArn =
  process.env[ValuationCallbackFunctionEnv.ERROR_TOPIC_ARN] ?? '<undefined>';

const stepFunctions = new StepFunctions();
const sns = new SNS();

export const handler = async (event: APIGatewayEvent): Promise<void> => {
  console.log(JSON.stringify({ event }, null, 2));

  // We use a try catch here, as we can't have a DLQ, because it isn't called asynchronously

  try {
    if (event.body === null) {
      throw new Error(`No body supplied`);
    }

    const valuationResponse = JSON.parse(event.body) as ValuationResponse;

    const taskTokenItem = await taskTokenStore.getAsync(
      valuationResponse.valuationReference
    );

    if (taskTokenItem === undefined)
      throw new Error('Unknown valuation reference');

    console.log(JSON.stringify({ taskTokenItem }, null, 2));

    if (valuationResponse.failed) {
      const taskFailureOutput = await stepFunctions
        .sendTaskFailure({
          taskToken: taskTokenItem.taskToken,
          error: 'ValuationFailed',
        })
        .promise();

      console.log(JSON.stringify({ taskFailureOutput }, null, 2));
    } else {
      const taskSuccessResponse = await stepFunctions
        .sendTaskSuccess({
          taskToken: taskTokenItem.taskToken,
          output: JSON.stringify(valuationResponse),
        })
        .promise();

      console.log(JSON.stringify({ taskSuccessResponse }, null, 2));
    }
  } catch (error: any) {
    console.error(JSON.stringify({ 'error.message': error.message }, null, 2));

    const publishInput: PublishInput = {
      Message: JSON.stringify({ 'description': error.message, event }),
      TopicArn: errorTopicArn,
    };

    await sns.publish(publishInput).promise();
  }
};
