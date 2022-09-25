/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import QuoteProcessor from '../../src/quote-processor/QuoteProcessor';
import {
  CREDIT_REPORT_REQUESTED_PATTERN,
  QUOTE_PROCESSED_PATTERN,
} from '../../src/domain/domain-event-patterns';

export default class QuoteProcessorTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'QuoteProcessorTestStack';

  static readonly DataBucketId = 'DataBucketId';

  static readonly ApplicationEventBusId = 'ApplicationEventBusId';

  static readonly QuoteProcessedObserverId = 'QuoteProcessedObserverId';

  static readonly CreditReportRequestedObserverId =
    'CreditReportRequestedObserverId';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: QuoteProcessorTestStack.Id,
      testFunctionIds: [
        QuoteProcessorTestStack.QuoteProcessedObserverId,
        QuoteProcessorTestStack.CreditReportRequestedObserverId,
      ],
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
      QuoteProcessorTestStack.ApplicationEventBusId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'QuoteProcessedRule',
        eventBus,
        QUOTE_PROCESSED_PATTERN
      ),
      QuoteProcessorTestStack.QuoteProcessedObserverId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'CreditReportRequestedRule',
        eventBus,
        CREDIT_REPORT_REQUESTED_PATTERN
      ),
      QuoteProcessorTestStack.CreditReportRequestedObserverId
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
