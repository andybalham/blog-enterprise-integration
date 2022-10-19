/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import DataStack from './stacks/DataStack';
import ApplicationStack from './stacks/ApplicationStack';
import MessagingStack from './stacks/MessagingStack';
import LenderStack from './stacks/LenderStack';
import WebhookStack from './stacks/WebhookStack';
import CreditBureauStack from './stacks/CreditBureauStack';

const LENDERS_PARAMETER_PATH_PREFIX = 'prod-lenders';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LoanBrokerProd');

const dataStack = new DataStack(app, 'DataStack');

const messagingStack = new MessagingStack(app, 'MessagingStack');

new ApplicationStack(app, 'ApplicationStack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  applicationEventBus: messagingStack.applicationEventBus,
  dataBucket: dataStack.quoteProcessorBucket,
});

new CreditBureauStack(app, 'CreditBureauStack', {
  applicationEventBus: messagingStack.applicationEventBus,
  dataBucket: dataStack.creditBureauBucket,
});

new LenderStack(app, 'Lender666Stack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  applicationEventBus: messagingStack.applicationEventBus,
  dataBucket: dataStack.lenderGatewayBucket,
  lenderConfig: {
    lenderId: 'Lender666',
    lenderName: 'Six-Six-Six Money',
    rate: 6.66,
    allowBankruptcies: true,
    allowNotOnElectoralRoll: true,
    minimumCreditScore: 0,
    minimumTermMonths: 0,
    maximumAmount: 1000000,
  },
});

new LenderStack(app, 'LenderSteadyStack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  applicationEventBus: messagingStack.applicationEventBus,
  dataBucket: dataStack.lenderGatewayBucket,
  lenderConfig: {
    lenderId: 'LenderSteady',
    lenderName: 'Steady Finance',
    rate: 3,
    allowBankruptcies: false,
    allowNotOnElectoralRoll: false,
    minimumCreditScore: 500,
    minimumTermMonths: 24,
    maximumAmount: 10000,
  },
});

new WebhookStack(app, 'WebhookStack', {
  applicationEventBus: messagingStack.applicationEventBus,
});
