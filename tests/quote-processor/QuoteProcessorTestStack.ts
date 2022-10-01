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
} from '../../src/domain/domain-event-patterns';
import {
  APPLICATION_EVENT_BUS_NAME,
  DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';

export default class QuoteProcessorTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'QuoteProcessorTestStack';

  static readonly DataBucketId = 'DataBucket';

  static readonly ApplicationEventBusId = 'ApplicationEventBus';

  static readonly QuoteProcessedObserverId = 'QuoteProcessedObserver';

  static readonly MockCreditBureauId = 'MockCreditBureau';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: QuoteProcessorTestStack.Id,
      testFunctionIds: [QuoteProcessorTestStack.QuoteProcessedObserverId],
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
          [APPLICATION_EVENT_BUS_NAME]: eventBus.eventBusArn,
          [DATA_BUCKET_NAME]: bucket.bucketName,
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

    // Hook up event to observe

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'QuoteProcessedRule',
        eventBus,
        QUOTE_PROCESSED_PATTERN
      ),
      QuoteProcessorTestStack.QuoteProcessedObserverId
    );

    // TODO 30Sep22: Add an SSM parameter for our test lenders

    new StringParameter(this, 'Lender1Parameter', {
      parameterName: '/lenders/my-lender-id-1',
      stringValue: 'true',
      tier: ParameterTier.STANDARD,
    });

    new StringParameter(this, 'Lender2Parameter', {
      parameterName: '/lenders/my-lender-id-2',
      stringValue: 'true',
      tier: ParameterTier.STANDARD,
    });

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
