/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import SSM from 'aws-sdk/clients/ssm';
import { LenderRegisterEntry } from '../domain/domain-models';
import { LENDERS_PARAMETER_PATH_PREFIX } from './constants';
import { QuoteProcessorState } from './QuoteProcessorState';

const ssm = new SSM();

const lendersParameterPathPrefix = process.env[LENDERS_PARAMETER_PATH_PREFIX];

export const handler = async (
  state: QuoteProcessorState
): Promise<QuoteProcessorState> => {
  console.log(JSON.stringify({ event: state }, null, 2));

  if (lendersParameterPathPrefix === undefined)
    throw new Error('lendersParameterPathPrefix === undefined');

  const lenderParams = await ssm
    .getParametersByPath({
      Path: `/${lendersParameterPathPrefix}`,
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
