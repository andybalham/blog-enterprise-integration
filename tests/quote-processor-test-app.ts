/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import QuoteProcessorTestStack from './quote-processor/QuoteProcessorTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'QuoteProcessorTest');

new QuoteProcessorTestStack(app, QuoteProcessorTestStack.Id);
