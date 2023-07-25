import { IntegrationTestStack } from '@andybalham/cdk-cloud-test-kit';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import RequestApi from '../../src/request-api/RequestApi';
import { EventType } from '../../src/domain/domain-events';
import { getNodejsFunctionProps } from '../../src/lib/utils';

export default class RequestApiTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'RequestApiTestStack';

  static readonly RequestApiId = 'RequestApi';

  static readonly EventObserverId = 'EventObserver';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: RequestApiTestStack.Id,
      integrationTestTable: true,
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

    const eventBus = new EventBus(this, 'EventBus');

    this.addTestFunction(
      new NodejsFunction(
        this,
        RequestApiTestStack.EventObserverId,
        getNodejsFunctionProps()
      )
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule('Rule', eventBus, {
        detailType: [EventType.QuoteSubmitted],
      }),
      RequestApiTestStack.EventObserverId
    );

    // SUT

    const sut = new RequestApi(this, 'SUT', {
      isTest: true,
      loanBrokerEventBus: eventBus,
      dataBucket: bucket,
    });

    this.addTestResourceTag(sut.api, RequestApiTestStack.RequestApiId);
  }
}
