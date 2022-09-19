/* eslint-disable no-new */
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import RequestApi from '../request-api/RequestApi';

export interface RequestTestStackProps extends StackProps {
  dataBucket: Bucket;
  applicationEventBus: EventBus;
}

export default class ApplicationStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: RequestTestStackProps) {
    super(scope, id, props);

    new RequestApi(this, 'RequestApi', {
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
    });
  }
}
