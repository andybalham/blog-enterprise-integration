/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import RequestApiTestStack from './request-api/RequestApiTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LoanBrokerTest');

new RequestApiTestStack(app, RequestApiTestStack.Id);
