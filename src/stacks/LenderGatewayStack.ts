/* eslint-disable no-new */
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import LenderGateway, { LenderConfig } from '../lender-gateway/LenderGateway';
import { blogBucketProps } from '../lib/blog-props';

export interface LenderStackProps extends StackProps {
  lenderConfig: LenderConfig;
  loanBrokerEventBus: EventBus;
  lendersParameterPathPrefix: string;
}

export default class LenderStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: LenderStackProps) {
    super(scope, id, props);

    const dataBucket = new Bucket(
      this,
      `${props.lenderConfig.lenderId}LenderBucket`,
      {
        ...blogBucketProps, // We wouldn't set these in production
        lifecycleRules: [
          {
            expiration: Duration.days(30),
          },
        ],
      }
    );

    new LenderGateway(this, `LenderGateway${props.lenderConfig.lenderId}`, {
      lendersParameterPathPrefix: props.lendersParameterPathPrefix,
      loanBrokerEventBus: props.loanBrokerEventBus,
      lenderConfig: props.lenderConfig,
      dataBucket,
    });
  }
}
