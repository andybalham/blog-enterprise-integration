/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import Observer from '../../src/observability/Observer';

export default class ObservabilityTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'ObservabilityTestStack';

  static readonly LoanBrokerEventBusId = 'LoanBrokerEventBusId';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: ObservabilityTestStack.Id,
    });

    const eventBus = new EventBus(
      this,
      ObservabilityTestStack.LoanBrokerEventBusId
    );

    // SUT

    new Observer(this, 'SUT', {
      loanBrokerEventBus: eventBus,
    });

    // Tag resources for testing

    this.addTestResourceTag(
      eventBus,
      ObservabilityTestStack.LoanBrokerEventBusId
    );
  }
}
