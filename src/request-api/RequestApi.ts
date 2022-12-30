import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { getNodejsFunctionProps } from '../lib/utils';
import {
  REQUEST_API_DATA_BUCKET_NAME,
  LOAN_BROKER_EVENT_BUS,
} from './RequestApi.EventPublisher';

export interface RequestApiProps {
  loanBrokerEventBus: EventBus;
  dataBucket: Bucket;
}

export default class RequestApi extends Construct {
  //
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: RequestApiProps) {
    super(scope, id);

    const eventPublisherFunction = new NodejsFunction(
      this,
      'EventPublisher',
      getNodejsFunctionProps({
        environment: {
          [REQUEST_API_DATA_BUCKET_NAME]: props.dataBucket.bucketName,
          [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusName,
        },
      })
    );

    props.dataBucket.grantReadWrite(eventPublisherFunction);
    props.loanBrokerEventBus.grantPutEventsTo(eventPublisherFunction);

    this.api = new RestApi(this, 'RequestApi');

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(eventPublisherFunction));
  }
}
