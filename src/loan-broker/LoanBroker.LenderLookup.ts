/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
import { SSM } from '@aws-sdk/client-ssm';
import { LenderRegisterEntry } from '../domain/domain-models';
import { LENDERS_PARAMETER_PATH_PREFIX } from './constants';
import { LoanBrokerState } from './LoanBrokerState';

const ssm = new SSM({});

const lendersParameterPathPrefix = process.env[LENDERS_PARAMETER_PATH_PREFIX];

// eslint-disable-next-line import/prefer-default-export
export const handler = async (
  state: LoanBrokerState
): Promise<LoanBrokerState> => {
  console.log(JSON.stringify({ event: state }, null, 2));

  if (lendersParameterPathPrefix === undefined)
    throw new Error('lendersParameterPathPrefix === undefined');

  const lenderParams = await ssm.getParametersByPath({
    Path: `/${lendersParameterPathPrefix}`,
  });

  console.log(
    JSON.stringify({ lenderParams: lenderParams.Parameters }, null, 2)
  );

  const lenders = lenderParams.Parameters?.filter((p) => p.Value).map(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (p) => JSON.parse(p.Value!) as LenderRegisterEntry
  );

  // eslint-disable-next-line no-param-reassign
  state.lenders = lenders?.filter((l) => l.isEnabled) ?? [];

  return state;
};
