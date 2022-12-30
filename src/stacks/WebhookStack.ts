/* eslint-disable no-new */
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import dotenv from 'dotenv';
import {
  CREDIT_REPORT_FAILED_PATTERN_V1,
  QUOTE_PROCESSED_PATTERN_V1,
} from '../domain/domain-event-patterns';
import { getNodejsFunctionProps } from '../lib/utils';

dotenv.config();

export interface WebhookStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
}

export default class WebhookStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: WebhookStackProps) {
    super(scope, id, props);

    const webhookSenderFunction = new NodejsFunction(
      this,
      'WebhookSender',
      getNodejsFunctionProps({
        environment: {
          LOAN_BROKER_EVENT_BUS: props.loanBrokerEventBus.eventBusName,
          WEBHOOK_URL: process.env.WEBHOOK_URL ?? '<undefined>',
        },
      })
    );

    const quoteProcessedCallbackRule = new Rule(
      this,
      'QuoteProcessedCallbackRule',
      {
        eventBus: props.loanBrokerEventBus,
        eventPattern: QUOTE_PROCESSED_PATTERN_V1,
      }
    );

    quoteProcessedCallbackRule.addTarget(
      new LambdaFunctionTarget(webhookSenderFunction)
    );

    const creditReportFailedCallbackRule = new Rule(
      this,
      'CreditReportFailedCallbackRule',
      {
        eventBus: props.loanBrokerEventBus,
        eventPattern: CREDIT_REPORT_FAILED_PATTERN_V1,
      }
    );

    creditReportFailedCallbackRule.addTarget(
      new LambdaFunctionTarget(webhookSenderFunction)
    );
  }
}
