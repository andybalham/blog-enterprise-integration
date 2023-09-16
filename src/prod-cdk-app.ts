/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import LoanBrokerStack from './stacks/LoanBrokerStack';
import MessagingStack from './stacks/MessagingStack';
import LenderGatewayStack from './stacks/LenderGatewayStack';
import WebhookStack from './stacks/WebhookStack';
import CreditBureauStack from './stacks/CreditBureauStack';
import RequestApiStack from './stacks/RequestApiStack';
import ObservabilityStack from './stacks/ObservabilityStack';

const LENDERS_PARAMETER_PATH_PREFIX = 'prod-lenders';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LoanBrokerProd');

const messagingStack = new MessagingStack(app, 'MessagingStack');

new ObservabilityStack(app, 'ObservabilityStack', {
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});

new LoanBrokerStack(app, 'LoanBrokerStack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});

new RequestApiStack(app, 'RequestApiStack', {
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});

new CreditBureauStack(app, 'CreditBureauStack', {
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});

new LenderGatewayStack(app, 'Lender666Stack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
  lenderConfig: {
    lenderId: 'Lender666',
    lenderName: 'Six-Six-Six Money',
    rate: 6.66,
    allowBankruptcies: true,
    allowNotOnElectoralRoll: true,
    minimumCreditScore: 0,
    minimumTermMonths: 0,
    maximumAmount: 1000000,
    // errorPercentage: 40,
  },
});

new LenderGatewayStack(app, 'LenderSmallBundlesStack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
  lenderConfig: {
    lenderId: 'LenderSmallBundles',
    lenderName: 'Small Bundles',
    rate: 5,
    allowBankruptcies: true,
    allowNotOnElectoralRoll: true,
    minimumCreditScore: 250,
    minimumTermMonths: 3,
    maximumAmount: 2000,
    // errorPercentage: 20,
  },
});

new LenderGatewayStack(app, 'LenderSteadyStack', {
  lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
  lenderConfig: {
    lenderId: 'LenderSteady',
    lenderName: 'Steady Finance',
    rate: 3,
    allowBankruptcies: false,
    allowNotOnElectoralRoll: false,
    minimumCreditScore: 500,
    minimumTermMonths: 24,
    maximumAmount: 10000,
    // errorPercentage: 10,
  },
});

new WebhookStack(app, 'WebhookStack', {
  loanBrokerEventBus: messagingStack.loanBrokerEventBus,
});
