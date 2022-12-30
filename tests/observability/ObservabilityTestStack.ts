/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { LOAN_BROKER_METRICS_PATTERN } from '../../src/domain/domain-event-patterns';
import Observer from '../../src/observability/Observer';

export default class ObservabilityTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'ObservabilityTestStack';

  static readonly LoanBrokerEventBusId = 'LoanBrokerEventBusId';

  static readonly MetricsPatternObserverId = 'MetricsPatternObserverId';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: ObservabilityTestStack.Id,
      testFunctionIds: [ObservabilityTestStack.MetricsPatternObserverId],
    });

    const eventBus = new EventBus(
      this,
      ObservabilityTestStack.LoanBrokerEventBusId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'LoanBrokerMetricsRule',
        eventBus,
        LOAN_BROKER_METRICS_PATTERN
      ),
      ObservabilityTestStack.MetricsPatternObserverId
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
