/* eslint-disable no-new */
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CreditBureauProps {
  applicationEventBus: EventBus;
  dataBucket: Bucket;
}

export default class CreditBureau extends Construct {
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(scope: Construct, id: string, props: CreditBureauProps) {
    super(scope, id);

    // TODO
  }
}
