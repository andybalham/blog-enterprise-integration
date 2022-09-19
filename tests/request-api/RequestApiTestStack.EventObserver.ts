/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { recordObservationDataAsync } from '@andybalham/cdk-cloud-test-kit/testFunctionLib';
import { fetchFromUrlAsync } from '../../src/lib/utils';
import { LoanApplicationDetails } from '../../src/domain/domain-models';
import { LoanApplicationSubmitted } from '../../src/domain/domain-events';

const documentClient = new DocumentClient();

export const handler = async (
  event: EventBridgeEvent<'LoanApplicationSubmitted', LoanApplicationSubmitted>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const loanApplicationDetails =
    await fetchFromUrlAsync<LoanApplicationDetails>(
      event.detail.data.loanApplicationDetailsUrl
    );

  console.log(JSON.stringify({ loanApplicationDetails }, null, 2));

  await recordObservationDataAsync(documentClient, {
    actualEventDetail: event.detail,
    actualLoanApplicationDetails: loanApplicationDetails,
  });
};
