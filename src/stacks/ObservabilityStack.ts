/* eslint-disable no-new */
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import dotenv from 'dotenv';
import Observer from '../observability/Observer';

dotenv.config();

export interface ObservabilityStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
}

export default class ObservabilityStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    new Observer(this, 'Observer', {
      loanBrokerEventBus: props.loanBrokerEventBus,
    });
  }
}
