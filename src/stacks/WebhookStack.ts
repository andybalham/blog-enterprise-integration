/* eslint-disable no-new */
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import dotenv from 'dotenv';
import { QUOTE_PROCESSED_PATTERN } from '../domain/domain-event-patterns';

dotenv.config();

export interface WebhookStackProps extends StackProps {
  applicationEventBus: EventBus;
}

export default class WebhookStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: WebhookStackProps) {
    super(scope, id, props);

    const webhookSenderFunction = new NodejsFunction(this, 'WebhookSender', {
      environment: {
        APPLICATION_EVENT_BUS_NAME: props.applicationEventBus.eventBusName,
        WEBHOOK_URL: process.env.WEBHOOK_URL ?? '<undefined>',
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    const quoteProcessedCallbackRule = new Rule(this, id, {
      eventBus: props.applicationEventBus,
      eventPattern: QUOTE_PROCESSED_PATTERN,
    });

    quoteProcessedCallbackRule.addTarget(
      new LambdaFunctionTarget(webhookSenderFunction)
    );
  }
}
