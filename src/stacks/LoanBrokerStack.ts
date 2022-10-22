/* eslint-disable no-new */
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { blogBucketProps } from '../lib/blog-props';
import LoanBroker from '../loan-broker/LoanBroker';

export interface LoanBrokerStackProps extends StackProps {
  loanBrokerEventBus: EventBus;
  lendersParameterPathPrefix: string;
}

export default class LoanBrokerStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: LoanBrokerStackProps) {
    super(scope, id, props);

    const dataBucket = new Bucket(this, 'LoanBrokerBucket', {
      ...blogBucketProps, // We wouldn't set these in production
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    new LoanBroker(this, 'LoanBroker', {
      lendersParameterPathPrefix: props.lendersParameterPathPrefix,
      loanBrokerEventBus: props.loanBrokerEventBus,
      dataBucket,
    });
  }
}
