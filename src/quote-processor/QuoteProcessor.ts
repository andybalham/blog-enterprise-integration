/* eslint-disable no-new */
import StateMachineBuilder from '@andybalham/state-machine-builder-v2';
import { Duration, Stack } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IChainable, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
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

    // https://bobbyhadz.com/blog/aws-cdk-iam-policy-example
    // https://bobbyhadz.com/blog/aws-cdk-add-lambda-permission
    // https://bobbyhadz.com/blog/cdk-get-region-accountid
    // https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html

    const lenderLookupFunction = new NodejsFunction(this, 'LenderLookup', {
      environment: {},
      logRetention: RetentionDays.ONE_DAY,
    });

    lenderLookupFunction.role?.attachInlinePolicy(
      new Policy(this, 'GetLendersPolicy', {
        statements: [
          new PolicyStatement({
            resources: [
              `arn:aws:ssm:${Stack.of(this).region}:${
                Stack.of(this).account
              }:parameter/lenders`,
            ],
            actions: ['ssm:GetParametersByPath'],
          }),
        ],
      })
    );

    // Rate requester

    const rateRequesterFunction = new NodejsFunction(this, 'RateRequester', {
      environment: {
        [APPLICATION_EVENT_BUS_NAME]: props.applicationEventBus.eventBusName,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    props.applicationEventBus.grantPutEventsTo(rateRequesterFunction);

    // State machine

    const stateMachine = new StateMachine(this, 'StateMachine', {
      definition: this.getStateMachine({
        creditReportRequesterFunction,
        lenderLookupFunction,
        rateRequesterFunction,
        responseSenderFunction,
      }),
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

  private getStateMachine({
    creditReportRequesterFunction,
    lenderLookupFunction,
    rateRequesterFunction,
    responseSenderFunction,
  }: {
    creditReportRequesterFunction: NodejsFunction;
    lenderLookupFunction: NodejsFunction;
    rateRequesterFunction: NodejsFunction;
    responseSenderFunction: NodejsFunction;
  }): IChainable {
    return new StateMachineBuilder()

      .lambdaInvokeWaitForTaskToken('RequestCreditReport', {
        lambdaFunction: creditReportRequesterFunction,
        parameters: {
          'state.$': '$',
        },
        resultPath: '$.creditReportReceived',
        timeout: Duration.seconds(10),
      })

      .lambdaInvoke('LookupLenders', {
        lambdaFunction: lenderLookupFunction,
        payloadResponseOnly: true,
      })

      .map('RequestRates', {
        // https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-map-state.html
        itemsPath: '$.lenders',
        parameters: {
          'quoteSubmitted.$': '$.quoteSubmitted',
          'creditReportReceived.$': '$.creditReportReceived',
          'lender.$': '$$.Map.Item.Value',
        },
        resultPath: '$.lenderRatesReceived',
        iterator: new StateMachineBuilder().lambdaInvokeWaitForTaskToken(
          'RequestRate',
          {
            lambdaFunction: rateRequesterFunction,
            parameters: {
              'quoteSubmitted.$': '$.quoteSubmitted',
              'creditReportReceived.$': '$.creditReportReceived',
              'lender.$': '$.lender',
            },
            timeout: Duration.seconds(10),
          }
        ),
      })

      .lambdaInvoke('SendResponse', {
        lambdaFunction: responseSenderFunction,
        payloadResponseOnly: true,
      })

      .build(this);
  }
}
