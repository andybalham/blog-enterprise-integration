/* eslint-disable no-new */
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CREDIT_REPORT_REQUESTED_PATTERN } from '../domain/domain-event-patterns';
import { APPLICATION_EVENT_BUS_NAME, DATA_BUCKET_NAME } from './constants';

export interface CreditBureauProps {
  applicationEventBus: EventBus;
  dataBucket: Bucket;
}

export default class CreditBureau extends Construct {
  //
  constructor(scope: Construct, id: string, props: CreditBureauProps) {
    super(scope, id);

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusArn,
        [DATA_BUCKET_NAME]: props.dataBucket.bucketName,
      },
    });

    const creditReportReceivedRule = new Rule(
      this,
      'CreditReportReceivedRule',
      {
        eventBus: props.applicationEventBus,
        eventPattern: CREDIT_REPORT_REQUESTED_PATTERN,
      }
    );

    creditReportReceivedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    props.dataBucket.grantReadWrite(requestHandlerFunction);
    props.applicationEventBus.grantPutEventsTo(requestHandlerFunction);
  }
}
