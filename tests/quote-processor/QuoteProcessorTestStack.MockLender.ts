/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { getTestPropsAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const LENDER_ID_NAME = 'LENDER_ID_NAME';

const documentClient = new DocumentClient();

export const handler = async (event: Record<string, any>): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const testProps = await getTestPropsAsync(documentClient);

  console.log(JSON.stringify({ testProps }, null, 2));

  // TODO 04Oct22: Use the test props to decide how to respond
};
