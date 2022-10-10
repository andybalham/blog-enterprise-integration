/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import LenderGatewayTestStack from './lender-gateway/LenderGatewayTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LenderGatewayTest');

new LenderGatewayTestStack(app, LenderGatewayTestStack.Id);
