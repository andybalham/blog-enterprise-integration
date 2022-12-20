/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import ObservabilityTestStack from './observability/ObservabilityTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ObservabilityTest');

new ObservabilityTestStack(app, ObservabilityTestStack.Id);
