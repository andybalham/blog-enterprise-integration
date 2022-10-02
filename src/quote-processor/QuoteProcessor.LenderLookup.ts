/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import SSM from 'aws-sdk/clients/ssm';
import { LenderRegisterEntry } from '../domain/domain-models';
import { QuoteProcessorState } from './QuoteProcessorState';

const ssm = new SSM();

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

  const lenders = lenderParams.Parameters?.filter((p) => p.Value).map(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (p) => JSON.parse(p.Value!) as LenderRegisterEntry
  );

  state.lenders = lenders?.filter((l) => l.isEnabled) ?? [];

  return state;
};
