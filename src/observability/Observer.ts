import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import {
  ComparisonOperator,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { LOAN_BROKER_METRICS_PATTERN } from '../domain/domain-event-patterns';
import { getNodejsFunctionProps } from '../lib/utils';
import {
  CREDIT_REPORT_FAILED_METRIC,
  METRICS_NAMESPACE as OBSERVER_NAMESPACE,
  METRICS_SERVICE_NAME as OBSERVER_SERVICE_NAME,
  QUOTE_PROCESSED_DURATION_METRIC,
} from './Observer.Measurer';
import { ENV_REQUEST_EVENT_TABLE_NAME } from './RequestEventTableClient';

export interface ObserverProps {
  loanBrokerEventBus: EventBus;
}

export default class Observer extends Construct {
  constructor(scope: Construct, id: string, props: ObserverProps) {
    super(scope, id);

    const requestEventTable = new Table(this, 'RequestEventTable', {
      partitionKey: { name: 'requestId', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiryTime',
    });

    const loggerFunction = new NodejsFunction(
      this,
      'Logger',
      getNodejsFunctionProps({
        logRetention: RetentionDays.ONE_WEEK,
        environment: {
          [ENV_REQUEST_EVENT_TABLE_NAME]: requestEventTable.tableName,
        },
      })
    );

    requestEventTable.grantWriteData(loggerFunction);

    const measurerFunction = new NodejsFunction(
      this,
      'Measurer',
      getNodejsFunctionProps({
        logRetention: RetentionDays.ONE_WEEK,
        environment: {
          [ENV_REQUEST_EVENT_TABLE_NAME]: requestEventTable.tableName,
        },
      })
    );

    requestEventTable.grantReadData(measurerFunction);

    const domainEventRule = new Rule(this, id, {
      eventBus: props.loanBrokerEventBus,
      eventPattern: LOAN_BROKER_METRICS_PATTERN,
    });

    domainEventRule.addTarget(new LambdaFunctionTarget(loggerFunction));
    domainEventRule.addTarget(new LambdaFunctionTarget(measurerFunction));

    // const measurerEMFunction = new NodejsFunction(
    //   this,
    //   'MeasurerEM',
    //   getNodejsFunctionProps({
    //     logRetention: RetentionDays.ONE_WEEK,
    //   })
    // );

    // domainEventRule.addTarget(new LambdaFunctionTarget(measurerEMFunction));

    // https://www.10printiamcool.com/creating-custom-metric-alarms-with-cdk

    const creditReportFailedCount = new Metric({
      namespace: OBSERVER_NAMESPACE,
      metricName: CREDIT_REPORT_FAILED_METRIC,
      dimensionsMap: {
        service: OBSERVER_SERVICE_NAME,
      },
    }).with({
      statistic: 'sum',
      period: Duration.minutes(5),
    });

    creditReportFailedCount.createAlarm(this, 'CreditReportFailedAlarm', {
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      threshold: 0,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    const quoteProcessedDuration = new Metric({
      namespace: OBSERVER_NAMESPACE,
      metricName: QUOTE_PROCESSED_DURATION_METRIC,
      dimensionsMap: {
        service: OBSERVER_SERVICE_NAME,
      },
    }).with({
      statistic: 'sum',
      period: Duration.minutes(5),
    });

    quoteProcessedDuration.createAlarm(this, 'QuoteProcessedDurationAlarm', {
      evaluationPeriods: 1,      
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      threshold: 2000,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html
    /*
    CloudWatch sends events to Amazon EventBridge whenever a CloudWatch alarm is created, updated, deleted, or changes alarm state. 
    You can use EventBridge and these events to write rules that take actions, such as notifying you, when an alarm changes state.
    */

    // https://aws.amazon.com/blogs/compute/using-api-destinations-with-amazon-eventbridge/
    // https://docs.aws.amazon.com/cdk/api/v1/python/aws_cdk.aws_events/README.html
    // https://docs.aws.amazon.com/cdk/api/v1/docs/aws-events-readme.html
  }
}
