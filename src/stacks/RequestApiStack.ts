/* eslint-disable no-new */
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { blogBucketProps } from '../lib/blog-props';
import RequestApi from '../request-api/RequestApi';

export interface RequestApiStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
}

export default class RequestApiStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: RequestApiStackProps) {
    super(scope, id, props);

    const dataBucket = new Bucket(this, 'RequestApiBucket', {
      ...blogBucketProps, // We wouldn't set these in production
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    new RequestApi(this, 'RequestApi', {
      loanBrokerEventBus: props.loanBrokerEventBus,
      dataBucket,
    });
  }
}
