import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { LOAN_BROKER_METRICS_PATTERN } from '../domain/domain-event-patterns';
import { getNodejsFunctionProps } from '../lib/utils';

export interface ObserverProps {
  loanBrokerEventBus: EventBus;
}

export default class Observer extends Construct {
  constructor(scope: Construct, id: string, props: ObserverProps) {
    super(scope, id);

    const domainEventRule = new Rule(this, id, {
      eventBus: props.loanBrokerEventBus,
      eventPattern: LOAN_BROKER_METRICS_PATTERN,
    });

    const loggerFunction = new NodejsFunction(
      this,
      'Logger',
      getNodejsFunctionProps({
        logRetention: RetentionDays.ONE_WEEK,
      })
    );

    domainEventRule.addTarget(new LambdaFunctionTarget(loggerFunction));

    const measurerFunction = new NodejsFunction(
      this,
      'Measurer',
      getNodejsFunctionProps({
        logRetention: RetentionDays.ONE_WEEK,
      })
    );

    domainEventRule.addTarget(new LambdaFunctionTarget(measurerFunction));

    // const measurerEMFunction = new NodejsFunction(
    //   this,
    //   'MeasurerEM',
    //   getNodejsFunctionProps({
    //     logRetention: RetentionDays.ONE_WEEK,
    //   })
    // );

    // domainEventRule.addTarget(new LambdaFunctionTarget(measurerEMFunction));
  }
}
