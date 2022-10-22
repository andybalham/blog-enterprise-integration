/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import LoanBrokerTestStack from './loan-broker/LoanBrokerTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LoanBrokerTest');

new LoanBrokerTestStack(app, LoanBrokerTestStack.Id);
