import {
  AccessLogFormat,
  ApiKey,
  ApiKeySourceType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi,
  UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { getNodejsFunctionProps } from '../lib/utils';
import {
  REQUEST_API_DATA_BUCKET_NAME,
  LOAN_BROKER_EVENT_BUS,
} from './RequestApi.EventPublisher';

export interface RequestApiProps {
  isTest?: boolean;
  loanBrokerEventBus: EventBus;
  dataBucket: Bucket;
}

export default class RequestApi extends Construct {
  //
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: RequestApiProps) {
    super(scope, id);

    const eventPublisherFunction = new NodejsFunction(
      this,
      'EventPublisher',
      getNodejsFunctionProps({
        tracing: Tracing.ACTIVE,
        environment: {
          [REQUEST_API_DATA_BUCKET_NAME]: props.dataBucket.bucketName,
          [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusName,
        },
      })
    );

    props.dataBucket.grantReadWrite(eventPublisherFunction);
    props.loanBrokerEventBus.grantPutEventsTo(eventPublisherFunction);

    const apiLogGroup = new LogGroup(this, 'ApiLogs', {
      retention: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.api = new RestApi(this, 'RequestApi', {
      apiKeySourceType: ApiKeySourceType.HEADER,
      restApiName: `Request API${props.isTest ? ' - Test' : ''}`,
      deployOptions: {
        tracingEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: new LogGroupLogDestination(apiLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
    });

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(eventPublisherFunction), {
      apiKeyRequired: true,
    });

    const apiKey = new ApiKey(this, 'ApiKey');

    const usagePlan = new UsagePlan(this, 'UsagePlan', {
      name: `Request API Usage Plan${props.isTest ? ' - Test' : ''}`,
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
    });

    usagePlan.addApiKey(apiKey);
  }
}
