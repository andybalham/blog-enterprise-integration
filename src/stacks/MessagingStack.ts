import { Stack } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

export default class MessagingStack extends Stack {
  //
  readonly loanBrokerEventBus: EventBus;

  constructor(scope: Construct, id: string) {
    //
    super(scope, id);

    this.loanBrokerEventBus = new EventBus(this, 'LoanBrokerEventBus');
  }
}
