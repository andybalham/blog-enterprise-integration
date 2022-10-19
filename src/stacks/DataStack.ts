import { Duration, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export default class DataStack extends Stack {
  //
  readonly quoteProcessorBucket: Bucket;

  readonly creditBureauBucket: Bucket;

  readonly lenderGatewayBucket: Bucket;

  constructor(scope: Construct, id: string) {
    //
    super(scope, id);

    this.quoteProcessorBucket = new Bucket(this, 'QuoteProcessorBucket', {
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    this.creditBureauBucket = new Bucket(this, 'CreditBureauBucket', {
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });

    this.lenderGatewayBucket = new Bucket(this, 'LenderGatewayBucket', {
      lifecycleRules: [
        {
          expiration: Duration.days(30),
        },
      ],
    });
  }
}
