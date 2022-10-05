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
  RATE_REQUESTED_PATTERN,
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

export default class QuoteProcessorTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'QuoteProcessorTestStack';

  static readonly DataBucketId = 'DataBucket';

  static readonly ApplicationEventBusId = 'ApplicationEventBus';

  static readonly QuoteProcessedObserverId = 'QuoteProcessedObserver';

  static readonly RateRequestedObserverId = 'RateRequestedObserver';

  static readonly MockCreditBureauId = 'MockCreditBureau';

  static readonly MockLenderId = 'MockLender';

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
        RATE_REQUESTED_PATTERN
      ),
      QuoteProcessorTestStack.MockLenderId
    );

    // Add SSM parameters for our test lenders

    const lenderRegisterEntries: LenderRegisterEntry[] = [
      {
        lenderId: 'Lender1',
        lenderName: 'Lender One',
        isEnabled: true,
      },
      {
        lenderId: 'Lender2',
        lenderName: 'Lender Two',
        isEnabled: true,
      },
      {
        lenderId: 'Lender3',
        lenderName: 'Lender Three',
        isEnabled: true,
      },
      {
        lenderId: 'Lender4',
        lenderName: 'Lender Four',
        isEnabled: false,
      },
    ];

    lenderRegisterEntries.forEach((l) => {
      new StringParameter(this, `${l.lenderId}Parameter`, {
        parameterName: `/lenders/${l.lenderId}`,
        stringValue: JSON.stringify(l),
        tier: ParameterTier.STANDARD,
      });
    });

    // Hook up events to observe

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'RateRequestedRule',
        eventBus,
        RATE_REQUESTED_PATTERN
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
    });

    // Tag resources for testing

    this.addTestResourceTag(bucket, QuoteProcessorTestStack.DataBucketId);
    this.addTestResourceTag(
      eventBus,
      QuoteProcessorTestStack.ApplicationEventBusId
    );
  }
}
