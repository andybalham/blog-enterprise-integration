/* eslint-disable no-new */
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import CreditBureau from '../credit-bureau/CreditBureau';

export interface CreditBureauStackProps extends StackProps {
  dataBucket: Bucket;
  applicationEventBus: EventBus;
}

export default class CreditBureauStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: CreditBureauStackProps) {
    super(scope, id, props);

    new CreditBureau(this, 'CreditBureau', {
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
    });
  }
}
