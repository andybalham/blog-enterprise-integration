import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import {
  DATA_BUCKET_NAME,
  APPLICATION_EVENT_BUS_NAME,
} from './RequestApi.EventPublisher';

export interface RequestApiProps {
  applicationEventBus: EventBus;
  dataBucket: Bucket;
}

export default class RequestApi extends Construct {
  //
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: RequestApiProps) {
    super(scope, id);

    const eventPublisherFunction = new NodejsFunction(this, 'EventPublisher', {
      environment: {
        [DATA_BUCKET_NAME]: props.dataBucket.bucketName,
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusName,
      },
    });

    props.dataBucket.grantReadWrite(eventPublisherFunction);
    props.applicationEventBus.grantPutEventsTo(eventPublisherFunction);

    this.api = new RestApi(this, 'RequestApi');

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(eventPublisherFunction));
  }
}
