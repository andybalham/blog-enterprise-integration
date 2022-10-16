/* eslint-disable no-new */
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import LenderGateway, { LenderConfig } from '../lender-gateway/LenderGateway';

export interface LenderStackProps extends StackProps {
  lenderConfig: LenderConfig;
  dataBucket: Bucket;
  applicationEventBus: EventBus;
  lendersParameterPathPrefix: string;
}

export default class LenderStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: LenderStackProps) {
    super(scope, id, props);

    new LenderGateway(this, `LenderGateway${props.lenderConfig.lenderId}`, {
      lendersParameterPathPrefix: props.lendersParameterPathPrefix,
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
      lenderConfig: props.lenderConfig,
    });
  }
}
