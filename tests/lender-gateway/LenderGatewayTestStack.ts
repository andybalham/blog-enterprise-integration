/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import LenderGateway, {
  LenderConfig,
} from '../../src/lender-gateway/LenderGateway';
import { LENDER_RATE_RECEIVED_PATTERN_V1 } from '../../src/domain/domain-event-patterns';

export const TEST_LENDER_ID = 'test-lender-id';

export const LENDERS_PARAMETER_PATH_PREFIX = 'lender-gateway-test-lenders';

export default class LenderGatewayTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'LenderGatewayTestStack';

  static readonly DataBucketId = 'DataBucketId';

  static readonly LoanBrokerEventBusId = 'LoanBrokerEventBusId';

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

    const loanBrokerEventBus = new EventBus(
      this,
      LenderGatewayTestStack.LoanBrokerEventBusId
    );

    const lenderConfig: LenderConfig = {
      lenderId: TEST_LENDER_ID,
      lenderName: 'Test Lender Name',
      rate: 6.66,
      allowBankruptcies: true,
      allowNotOnElectoralRoll: true,
    };

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'Rule',
        loanBrokerEventBus,
        LENDER_RATE_RECEIVED_PATTERN_V1
      ),
      LenderGatewayTestStack.EventObserverId
    );

    // SUT

    new LenderGateway(this, 'SUT', {
      lenderConfig,
      loanBrokerEventBus,
      dataBucket,
      lendersParameterPathPrefix: LENDERS_PARAMETER_PATH_PREFIX,
    });

    // Tag resources for testing

    this.addTestResourceTag(
      loanBrokerEventBus,
      LenderGatewayTestStack.LoanBrokerEventBusId
    );

    this.addTestResourceTag(dataBucket, LenderGatewayTestStack.DataBucketId);
  }
}
