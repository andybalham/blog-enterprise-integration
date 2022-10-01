/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import SSM from 'aws-sdk/clients/ssm';
import { QuoteProcessorState } from './QuoteProcessorState';

const ssm = new SSM();

/* eslint-disable no-console */
export const handler = async (
  state: QuoteProcessorState
): Promise<QuoteProcessorState> => {
  console.log(JSON.stringify({ event: state }, null, 2));

  const lenderParams = await ssm
    .getParametersByPath({
      Path: '/lenders',
    })
    .promise();

  console.log(
    JSON.stringify({ lenderParams: lenderParams.Parameters }, null, 2)
  );

  const lenderIds = lenderParams.Parameters?.filter(
    (p) => p?.Value?.toLowerCase() === 'true'
  ).map((p) => p.Name ?? '');

  state.lenderIds = lenderIds;

  return state;
};
