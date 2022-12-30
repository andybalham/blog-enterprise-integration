/* eslint-disable no-new */
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CREDIT_REPORT_REQUESTED_PATTERN_V1 } from '../domain/domain-event-patterns';
import {
  LOAN_BROKER_EVENT_BUS,
  CREDIT_BUREAU_DATA_BUCKET_NAME,
} from './constants';
import { getNodejsFunctionProps } from '../lib/utils';

export interface CreditBureauProps {
  loanBrokerEventBus: EventBus;
  dataBucket: Bucket;
}

export default class CreditBureau extends Construct {
  //
  constructor(scope: Construct, id: string, props: CreditBureauProps) {
    super(scope, id);

    const requestHandlerFunction = new NodejsFunction(
      this,
      'RequestHandler',
      getNodejsFunctionProps({
        environment: {
          [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusArn,
          [CREDIT_BUREAU_DATA_BUCKET_NAME]: props.dataBucket.bucketName,
        },
      })
    );

    const creditReportReceivedRule = new Rule(
      this,
      'CreditReportReceivedRule',
      {
        eventBus: props.loanBrokerEventBus,
        eventPattern: CREDIT_REPORT_REQUESTED_PATTERN_V1,
      }
    );

    creditReportReceivedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    props.dataBucket.grantReadWrite(requestHandlerFunction);
    props.loanBrokerEventBus.grantPutEventsTo(requestHandlerFunction);
  }
}
