import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { EventDetailType, EventDomain } from 'src/domain/domain-events';

export interface QuoteProcessorProps {
  applicationEventBus: EventBus;
}

export default class QuoteProcessor extends Construct {
  //
  constructor(scope: Construct, id: string, props: QuoteProcessorProps) {
    super(scope, id);

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        'applicationEventBus.eventBusArn':
          props.applicationEventBus.eventBusArn,
      },
    });

    const quoteSubmittedRule = new Rule(this, 'QuoteSubmittedRule', {
      eventBus: props.applicationEventBus,
      eventPattern: {
        detailType: [EventDetailType.QuoteSubmitted],
      },
    });

    quoteSubmittedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    // TODO 20Sep22: Have the Request Handler kick off the step function with a single lambda to send a response
    //               We can then write a unit test to raise an event and listen, then fetch the result
  }
}
