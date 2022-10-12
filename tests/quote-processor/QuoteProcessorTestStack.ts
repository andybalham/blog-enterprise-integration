/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import QuoteProcessor from '../../src/quote-processor/QuoteProcessor';
import {
  CREDIT_REPORT_REQUESTED_PATTERN,
  QUOTE_PROCESSED_PATTERN,
  LENDER_RATE_REQUESTED_PATTERN,
} from '../../src/domain/domain-event-patterns';
import {
  APPLICATION_EVENT_BUS_NAME as CREDIT_BUREAU_APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME as CREDIT_BUREAU_DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';
import { LenderRegisterEntry } from '../../src/domain/domain-models';
import {
  APPLICATION_EVENT_BUS_NAME as LENDER_GATEWAY_APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME as LENDER_GATEWAY_DATA_BUCKET_NAME,
} from '../../src/lender-gateway/constants';

const lendersParameterPathPrefix = 'quote-processor-test-lenders';
export default class QuoteProcessorTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'QuoteProcessorTestStack';

  static readonly DataBucketId = 'DataBucket';

  static readonly ApplicationEventBusId = 'ApplicationEventBus';

  static readonly QuoteProcessedObserverId = 'QuoteProcessedObserver';

  static readonly RateRequestedObserverId = 'RateRequestedObserver';

  static readonly MockCreditBureauId = 'MockCreditBureau';

  static readonly MockLenderId = 'MockLender';

  static readonly LENDER_1_ID = 'Lender1';

  static readonly LENDER_2_ID = 'Lender2';

  static readonly LENDER_3_ID = 'Lender3';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: QuoteProcessorTestStack.Id,
      testFunctionIds: [
        QuoteProcessorTestStack.QuoteProcessedObserverId,
        QuoteProcessorTestStack.RateRequestedObserverId,
      ],
    });

    // Data bucket

    const bucket = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
        },
      ],
    });

    // Application event bus

    const eventBus = new EventBus(
      this,
      QuoteProcessorTestStack.ApplicationEventBusId
    );

    // Mock credit bureau

    const mockCreditBureauFunction = new NodejsFunction(
      this,
      QuoteProcessorTestStack.MockCreditBureauId,
      {
        environment: {
          [CREDIT_BUREAU_APPLICATION_EVENT_BUS_NAME]: eventBus.eventBusArn,
          [CREDIT_BUREAU_DATA_BUCKET_NAME]: bucket.bucketName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    this.addTestFunction(mockCreditBureauFunction);

    bucket.grantReadWrite(mockCreditBureauFunction);
    eventBus.grantPutEventsTo(mockCreditBureauFunction);

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'CreditReportRequestedMockRule',
        eventBus,
        CREDIT_REPORT_REQUESTED_PATTERN
      ),
      QuoteProcessorTestStack.MockCreditBureauId
    );

    // Mock lender

    const mockLenderFunction = new NodejsFunction(
      this,
      QuoteProcessorTestStack.MockLenderId,
      {
        environment: {
          [LENDER_GATEWAY_APPLICATION_EVENT_BUS_NAME]: eventBus.eventBusArn,
          [LENDER_GATEWAY_DATA_BUCKET_NAME]: bucket.bucketName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    this.addTestFunction(mockLenderFunction);

    bucket.grantReadWrite(mockLenderFunction);
    eventBus.grantPutEventsTo(mockLenderFunction);

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'RateRequestedMockRule',
        eventBus,
        LENDER_RATE_REQUESTED_PATTERN
      ),
      QuoteProcessorTestStack.MockLenderId
    );

    // Add SSM parameters for our test lenders

    const lenderRegisterEntries: LenderRegisterEntry[] = [
      {
        lenderId: QuoteProcessorTestStack.LENDER_1_ID,
        isEnabled: true,
      },
      {
        lenderId: QuoteProcessorTestStack.LENDER_2_ID,
        isEnabled: true,
      },
      {
        lenderId: QuoteProcessorTestStack.LENDER_3_ID,
        isEnabled: false,
      },
    ];

    lenderRegisterEntries.forEach((l) => {
      new StringParameter(this, `${l.lenderId}Parameter`, {
        parameterName: `/${lendersParameterPathPrefix}/${l.lenderId}`,
        stringValue: JSON.stringify(l),
        tier: ParameterTier.STANDARD,
      });
    });

    // Hook up events to observe

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'RateRequestedRule',
        eventBus,
        LENDER_RATE_REQUESTED_PATTERN
      ),
      QuoteProcessorTestStack.RateRequestedObserverId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'QuoteProcessedRule',
        eventBus,
        QUOTE_PROCESSED_PATTERN
      ),
      QuoteProcessorTestStack.QuoteProcessedObserverId
    );

    // SUT

    new QuoteProcessor(this, 'SUT', {
      applicationEventBus: eventBus,
      lendersParameterPathPrefix,
    });

    // Tag resources for testing

    this.addTestResourceTag(bucket, QuoteProcessorTestStack.DataBucketId);
    this.addTestResourceTag(
      eventBus,
      QuoteProcessorTestStack.ApplicationEventBusId
    );
  }
}
