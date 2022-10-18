/* eslint-disable no-new */
import { Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import CreditBureau from '../credit-bureau/CreditBureau';
import QuoteProcessor from '../quote-processor/QuoteProcessor';
import RequestApi from '../request-api/RequestApi';

export interface ApplicationStackProps extends StackProps {
  dataBucket: Bucket;
  applicationEventBus: EventBus;
  lendersParameterPathPrefix: string;
}

export default class ApplicationStack extends Stack {
  //
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    new CreditBureau(this, 'CreditBureau', {
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
    });

    new QuoteProcessor(this, 'QuoteProcessor', {
      lendersParameterPathPrefix: props.lendersParameterPathPrefix,
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
    });

    new RequestApi(this, 'RequestApi', {
      applicationEventBus: props.applicationEventBus,
      dataBucket: props.dataBucket,
    });
  }
}
