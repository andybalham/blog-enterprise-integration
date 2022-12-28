/* eslint-disable no-new */
import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import LoanBroker from '../../src/loan-broker/LoanBroker';
import {
  CREDIT_REPORT_REQUESTED_PATTERN_V1,
  QUOTE_PROCESSED_PATTERN_V1,
  LENDER_RATE_REQUESTED_PATTERN_V1,
  CREDIT_REPORT_FAILED_PATTERN_V1,
  LENDER_RATE_FAILED_PATTERN_V1,
} from '../../src/domain/domain-event-patterns';
import {
  LOAN_BROKER_EVENT_BUS as CREDIT_BUREAU_LOAN_BROKER_EVENT_BUS,
  CREDIT_BUREAU_DATA_BUCKET_NAME,
} from '../../src/credit-bureau/constants';
import { LenderRegisterEntry } from '../../src/domain/domain-models';
import {
  LOAN_BROKER_EVENT_BUS as LENDER_GATEWAY_LOAN_BROKER_EVENT_BUS,
  LENDER_GATEWAY_DATA_BUCKET_NAME,
} from '../../src/lender-gateway/constants';

const lendersParameterPathPrefix = 'quote-processor-test-lenders';

export default class LoanBrokerTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'LoanBrokerTestStack';

  static readonly DataBucketId = 'DataBucket';

  static readonly StateMachineId = 'StateMachine';

  static readonly LoanBrokerEventBusId = 'LoanBrokerEventBus';

  static readonly QuoteProcessedObserverId = 'QuoteProcessedObserver';

  static readonly CreditReportFailedObserverId = 'CreditReportFailedObserver';

  static readonly LenderRateFailedObserverId = 'LenderRateFailedObserver';

  static readonly RateRequestedObserverId = 'RateRequestedObserver';

  static readonly MockCreditBureauId = 'MockCreditBureau';

  static readonly MockLenderId = 'MockLender';

  static readonly LENDER_1_ID = 'Lender1';

  static readonly LENDER_2_ID = 'Lender2';

  static readonly LENDER_3_ID = 'Lender3';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: LoanBrokerTestStack.Id,
      testFunctionIds: [
        LoanBrokerTestStack.QuoteProcessedObserverId,
        LoanBrokerTestStack.RateRequestedObserverId,
        LoanBrokerTestStack.CreditReportFailedObserverId,
        LoanBrokerTestStack.LenderRateFailedObserverId,
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
      LoanBrokerTestStack.LoanBrokerEventBusId
    );

    // Mock credit bureau

    const mockCreditBureauFunction = new NodejsFunction(
      this,
      LoanBrokerTestStack.MockCreditBureauId,
      {
        environment: {
          [CREDIT_BUREAU_LOAN_BROKER_EVENT_BUS]: eventBus.eventBusArn,
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
        CREDIT_REPORT_REQUESTED_PATTERN_V1
      ),
      LoanBrokerTestStack.MockCreditBureauId
    );

    // Mock lender

    const mockLenderFunction = new NodejsFunction(
      this,
      LoanBrokerTestStack.MockLenderId,
      {
        environment: {
          [LENDER_GATEWAY_LOAN_BROKER_EVENT_BUS]: eventBus.eventBusArn,
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
        LENDER_RATE_REQUESTED_PATTERN_V1
      ),
      LoanBrokerTestStack.MockLenderId
    );

    // Add SSM parameters for our test lenders

    const lenderRegisterEntries: LenderRegisterEntry[] = [
      {
        lenderId: LoanBrokerTestStack.LENDER_1_ID,
        isEnabled: true,
      },
      {
        lenderId: LoanBrokerTestStack.LENDER_2_ID,
        isEnabled: true,
      },
      {
        lenderId: LoanBrokerTestStack.LENDER_3_ID,
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
        LENDER_RATE_REQUESTED_PATTERN_V1
      ),
      LoanBrokerTestStack.RateRequestedObserverId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'QuoteProcessedRule',
        eventBus,
        QUOTE_PROCESSED_PATTERN_V1
      ),
      LoanBrokerTestStack.QuoteProcessedObserverId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'CreditReportFailedRule',
        eventBus,
        CREDIT_REPORT_FAILED_PATTERN_V1
      ),
      LoanBrokerTestStack.CreditReportFailedObserverId
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'LenderRateFailedRule',
        eventBus,
        LENDER_RATE_FAILED_PATTERN_V1
      ),
      LoanBrokerTestStack.LenderRateFailedObserverId
    );

    // SUT

    const loanBroker = new LoanBroker(this, 'SUT', {
      loanBrokerEventBus: eventBus,
      dataBucket: bucket,
      lendersParameterPathPrefix,
    });

    // Tag resources for testing

    this.addTestResourceTag(
      loanBroker.stateMachine,
      LoanBrokerTestStack.StateMachineId
    );
    this.addTestResourceTag(bucket, LoanBrokerTestStack.DataBucketId);
    this.addTestResourceTag(eventBus, LoanBrokerTestStack.LoanBrokerEventBusId);
  }
}
