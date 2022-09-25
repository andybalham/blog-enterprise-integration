/* eslint-disable no-new */
import StateMachineBuilder from '@andybalham/state-machine-builder-v2';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { QUOTE_SUBMITTED_PATTERN } from '../domain/domain-event-patterns';
import { APPLICATION_EVENT_BUS_NAME, STATE_MACHINE_ARN } from './constants';

export interface QuoteProcessorProps {
  applicationEventBus: EventBus;
}

export default class QuoteProcessor extends Construct {
  //
  constructor(scope: Construct, id: string, props: QuoteProcessorProps) {
    super(scope, id);

    // TODO 20Sep22: Have the Request Handler kick off the step function with a single lambda to send a response
    //               We can then write a unit test to raise an event and listen, then fetch the result

    const responseSenderFunction = new NodejsFunction(this, 'ResponseSender', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusName,
      },
    });

    props.applicationEventBus.grantPutEventsTo(responseSenderFunction);

    const stateMachine = new StateMachine(this, 'StateMachine', {
      definition: new StateMachineBuilder()
        .lambdaInvoke('SendResponse', {
          lambdaFunction: responseSenderFunction,
        })
        .build(this, {
          defaultProps: {
            lambdaInvoke: {
              payloadResponseOnly: true,
            },
          },
        }),
    });

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusArn,
        [STATE_MACHINE_ARN]: stateMachine.stateMachineArn,
      },
    });

    const quoteSubmittedRule = new Rule(this, 'QuoteSubmittedRule', {
      eventBus: props.applicationEventBus,
      eventPattern: QUOTE_SUBMITTED_PATTERN,
    });

    quoteSubmittedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    stateMachine.grantStartExecution(requestHandlerFunction);
  }
}