/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import CreditBureau from '../../src/credit-bureau/CreditBureau';

export default class CreditBureauTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'CreditBureauTestStack';

  static readonly DataBucketId = 'DataBucketId';

  static readonly ApplicationEventBusId = 'ApplicationEventBusId';

  static readonly EventObserverId = 'EventObserver';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: CreditBureauTestStack.Id,
      testFunctionIds: [CreditBureauTestStack.EventObserverId],
    });

    const bucket = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
        },
      ],
    });

    const eventBus = new EventBus(
      this,
      CreditBureauTestStack.ApplicationEventBusId
    );

    // SUT

    new CreditBureau(this, 'SUT', {
      applicationEventBus: eventBus,
      dataBucket: bucket,
    });

    // Tag resources for testing

    this.addTestResourceTag(
      eventBus,
      CreditBureauTestStack.ApplicationEventBusId
    );

    this.addTestResourceTag(bucket, CreditBureauTestStack.DataBucketId);
  }
}
