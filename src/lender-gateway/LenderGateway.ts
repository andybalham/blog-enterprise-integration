/* eslint-disable no-new */
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { getLenderRateRequestedPattern } from '../domain/domain-event-patterns';
import {
  LOAN_BROKER_EVENT_BUS,
  LENDER_GATEWAY_DATA_BUCKET_NAME,
  LENDER_CONFIG,
} from './constants';
import { LenderRegisterEntry } from '../domain/domain-models';

export interface LenderConfig {
  lenderId: string;
  lenderName: string;
  rate: number;
  allowBankruptcies?: boolean;
  allowNotOnElectoralRoll?: boolean;
  minimumCreditScore?: number;
  minimumTermMonths?: number;
  maximumAmount?: number;
}

export interface LenderGatewayProps {
  lenderConfig: LenderConfig;
  loanBrokerEventBus: EventBus;
  dataBucket: Bucket;
  lendersParameterPathPrefix: string;
}

export default class LenderGateway extends Construct {
  //
  constructor(scope: Construct, id: string, props: LenderGatewayProps) {
    super(scope, id);

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        [LENDER_CONFIG]: JSON.stringify(props.lenderConfig),
        [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusArn,
        [LENDER_GATEWAY_DATA_BUCKET_NAME]: props.dataBucket.bucketName,
      },
    });

    const lenderRateRequestedRule = new Rule(
      this,
      'LenderRateRequestedPattern',
      {
        eventBus: props.loanBrokerEventBus,
        eventPattern: getLenderRateRequestedPattern(
          props.lenderConfig.lenderId
        ),
      }
    );

    lenderRateRequestedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    props.dataBucket.grantReadWrite(requestHandlerFunction);
    props.loanBrokerEventBus.grantPutEventsTo(requestHandlerFunction);

    const lenderRegisterEntry: LenderRegisterEntry = {
      lenderId: props.lenderConfig.lenderId,
      isEnabled: true,
    };

    new StringParameter(this, `${props.lenderConfig.lenderId}Parameter`, {
      parameterName: `/${props.lendersParameterPathPrefix}/${props.lenderConfig.lenderId}`,
      stringValue: JSON.stringify(lenderRegisterEntry),
      tier: ParameterTier.STANDARD,
    });
  }
}
