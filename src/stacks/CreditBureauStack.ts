/* eslint-disable no-new */
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import CreditBureau from '../credit-bureau/CreditBureau';
import { blogBucketProps } from '../lib/blog-props';

export interface CreditBureauStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
}

export default class CreditBureauStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: CreditBureauStackProps) {
    super(scope, id, props);

    const dataBucket = new Bucket(this, 'CreditBureauBucket', {
      ...blogBucketProps, // We wouldn't set these in production
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    new CreditBureau(this, 'CreditBureau', {
      loanBrokerEventBus: props.loanBrokerEventBus,
      dataBucket,
    });
  }
}
