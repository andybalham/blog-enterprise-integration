/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import DataStack from './stacks/DataStack';
import RequestApiStack from './stacks/ApplicationStack';
import MessagingStack from './stacks/MessagingStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'LoanBrokerProd');

const dataStack = new DataStack(app, 'DataStack');

const messagingStack = new MessagingStack(app, 'MessagingStack');

new RequestApiStack(app, 'ApplicationStack', {
  applicationEventBus: messagingStack.applicationEventBus,
  dataBucket: dataStack.dataBucket,
});
