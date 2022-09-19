import { Duration, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export default class DataStack extends Stack {
  //
  readonly dataBucket: Bucket;

  constructor(scope: Construct, id: string) {
    //
    super(scope, id);

    this.dataBucket = new Bucket(this, 'DataBucket', {
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });
  }
}
