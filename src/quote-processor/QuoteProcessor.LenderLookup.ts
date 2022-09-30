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

  // TODO 30Sep22: Actually retrieve the lender information
  
  const lenderParams = await ssm
    .getParametersByPath({
      Path: '/lenders',
    })
    .promise();

  console.log(JSON.stringify({ lenderParams }, null, 2));

  state.lenders = [
    {
      id: 'lender-id',
      name: 'lender-name',
      isEnabled: true,
    },
  ];

  return state;
};
