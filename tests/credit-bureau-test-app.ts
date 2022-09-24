/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import CreditBureauTestStack from './credit-bureau/CreditBureauTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'CreditBureauTest');

new CreditBureauTestStack(app, CreditBureauTestStack.Id);
