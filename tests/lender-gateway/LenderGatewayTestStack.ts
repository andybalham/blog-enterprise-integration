/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import LenderGateway, {
  LenderConfig,
} from '../../src/lender-gateway/LenderGateway';
import { getLenderRateRequestedPattern } from '../../src/domain/domain-event-patterns';

export default class LenderGatewayTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'LenderGatewayTestStack';

  static readonly DataBucketId = 'DataBucketId';

  static readonly ApplicationEventBusId = 'ApplicationEventBusId';

  static readonly EventObserverId = 'EventObserver';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: LenderGatewayTestStack.Id,
      testFunctionIds: [LenderGatewayTestStack.EventObserverId],
    });

    const dataBucket = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
        },
      ],
    });

    const applicationEventBus = new EventBus(
      this,
      LenderGatewayTestStack.ApplicationEventBusId
    );

    const lenderConfig: LenderConfig = {
      lenderId: 'test-lender-id',
      lenderName: 'Test Lender Name',
      rate: 6.66,
      allowBankruptcies: true,
      allowNotOnElectoralRoll: true,
    };

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'Rule',
        applicationEventBus,
        getLenderRateRequestedPattern(lenderConfig.lenderId)
      ),
      LenderGatewayTestStack.EventObserverId
    );

    // SUT

    new LenderGateway(this, 'SUT', {
      lenderConfig,
      applicationEventBus,
      dataBucket,
    });

    // Tag resources for testing

    this.addTestResourceTag(
      applicationEventBus,
      LenderGatewayTestStack.ApplicationEventBusId
    );

    this.addTestResourceTag(dataBucket, LenderGatewayTestStack.DataBucketId);
  }
}
