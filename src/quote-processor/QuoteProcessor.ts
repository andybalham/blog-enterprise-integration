/* eslint-disable no-new */
import StateMachineBuilder from '@andybalham/state-machine-builder-v2';
import { Duration } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  IntegrationPattern,
  JsonPath,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import {
  QUOTE_PROCESSOR_CALLBACK_PATTERN,
  QUOTE_SUBMITTED_PATTERN,
} from '../domain/domain-event-patterns';
import { APPLICATION_EVENT_BUS_NAME, STATE_MACHINE_ARN } from './constants';

export interface QuoteProcessorProps {
  applicationEventBus: EventBus;
}

export default class QuoteProcessor extends Construct {
  //
  constructor(scope: Construct, id: string, props: QuoteProcessorProps) {
    super(scope, id);

    // Response sender function

    const responseSenderFunction = new NodejsFunction(this, 'ResponseSender', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusName,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    props.applicationEventBus.grantPutEventsTo(responseSenderFunction);

    // Credit report requester

    const creditReportRequesterFunction = new NodejsFunction(
      this,
      'CreditReportRequester',
      {
        environment: {
          [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    props.applicationEventBus.grantPutEventsTo(creditReportRequesterFunction);

    // Lender reader

    const lenderLookupFunction = new NodejsFunction(this, 'LenderLookup', {
      environment: {},
      logRetention: RetentionDays.ONE_DAY,
    });

    // State machine

    const stateMachine = new StateMachine(this, 'StateMachine', {
      definition: new StateMachineBuilder()
        .lambdaInvoke('RequestCreditReport', {
          lambdaFunction: creditReportRequesterFunction,
          integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
          payload: TaskInput.fromObject({
            taskToken: JsonPath.taskToken,
            'state.$': '$',
          }),
          resultPath: '$.creditReportReceived',
          timeout: Duration.seconds(30), // Don't wait forever for a reply
        })
        .lambdaInvoke('LookupLenders', {
          lambdaFunction: lenderLookupFunction,
          payloadResponseOnly: true,
        })
        .lambdaInvoke('SendResponse', {
          lambdaFunction: responseSenderFunction,
          payloadResponseOnly: true,
        })
        .build(this),
    });

    // Request handler function

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusArn,
        [STATE_MACHINE_ARN]: stateMachine.stateMachineArn,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    const quoteSubmittedRule = new Rule(this, 'QuoteSubmittedRule', {
      eventBus: props.applicationEventBus,
      eventPattern: QUOTE_SUBMITTED_PATTERN,
    });

    quoteSubmittedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    stateMachine.grantStartExecution(requestHandlerFunction);

    // Callback handler function

    const callbackHandlerFunction = new NodejsFunction(
      this,
      'CallbackHandler',
      {
        environment: {
          [STATE_MACHINE_ARN]: stateMachine.stateMachineArn,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    const quoteProcessorCallbackRule = new Rule(this, id, {
      eventBus: props.applicationEventBus,
      eventPattern: QUOTE_PROCESSOR_CALLBACK_PATTERN,
    });

    quoteProcessorCallbackRule.addTarget(
      new LambdaFunctionTarget(callbackHandlerFunction)
    );

    stateMachine.grantTaskResponse(callbackHandlerFunction);
  }
}
