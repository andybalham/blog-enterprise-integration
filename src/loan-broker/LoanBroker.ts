/* eslint-disable no-new */
import StateMachineBuilder from '@andybalham/state-machine-builder-v2';
import { Duration, Stack } from 'aws-cdk-lib';
import { EventBus, IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  IChainable,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { EventBridgePutEvents } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import {
  LOAN_BROKER_CALLBACK_PATTERN_V1,
  QUOTE_SUBMITTED_PATTERN_V1,
} from '../domain/domain-event-patterns';
import { EventDomain, EventService, EventType } from '../domain/domain-events';
import {
  LOAN_BROKER_EVENT_BUS,
  LOAN_BROKER_DATA_BUCKET_NAME,
  LENDERS_PARAMETER_PATH_PREFIX,
  STATE_MACHINE_ARN,
} from './constants';

export interface LoanBrokerProps {
  loanBrokerEventBus: EventBus;
  dataBucket: Bucket;
  lendersParameterPathPrefix: string;
}

export default class LoanBroker extends Construct {
  //
  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: LoanBrokerProps) {
    super(scope, id);

    // Response sender function

    const responseSenderFunction = new NodejsFunction(this, 'ResponseSender', {
      environment: {
        [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusName,
        [LOAN_BROKER_DATA_BUCKET_NAME]: props.dataBucket.bucketName,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    props.loanBrokerEventBus.grantPutEventsTo(responseSenderFunction);
    props.dataBucket.grantReadWrite(responseSenderFunction);

    // Credit report requester

    const creditReportRequesterFunction = new NodejsFunction(
      this,
      'CreditReportRequester',
      {
        environment: {
          [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    props.loanBrokerEventBus.grantPutEventsTo(creditReportRequesterFunction);

    // Lender reader

    // https://bobbyhadz.com/blog/aws-cdk-iam-policy-example
    // https://bobbyhadz.com/blog/aws-cdk-add-lambda-permission
    // https://bobbyhadz.com/blog/cdk-get-region-accountid
    // https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html

    const lenderLookupFunction = new NodejsFunction(this, 'LenderLookup', {
      environment: {
        [LENDERS_PARAMETER_PATH_PREFIX]: props.lendersParameterPathPrefix,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    lenderLookupFunction.role?.attachInlinePolicy(
      new Policy(this, 'GetLendersPolicy', {
        statements: [
          new PolicyStatement({
            resources: [
              `arn:aws:ssm:${Stack.of(this).region}:${
                Stack.of(this).account
              }:parameter/${props.lendersParameterPathPrefix}`,
            ],
            actions: ['ssm:GetParametersByPath'],
          }),
        ],
      })
    );

    // Rate requester

    const rateRequesterFunction = new NodejsFunction(this, 'RateRequester', {
      environment: {
        [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusName,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    props.loanBrokerEventBus.grantPutEventsTo(rateRequesterFunction);

    // State machine

    this.stateMachine = new StateMachine(this, 'StateMachine', {
      definition: this.getStateMachine({
        loanBrokerEventBus: props.loanBrokerEventBus,
        creditReportRequesterFunction,
        lenderLookupFunction,
        rateRequesterFunction,
        responseSenderFunction,
      }),
    });

    // Request handler function

    const requestHandlerFunction = new NodejsFunction(this, 'RequestHandler', {
      environment: {
        [LOAN_BROKER_EVENT_BUS]: props.loanBrokerEventBus.eventBusArn,
        [STATE_MACHINE_ARN]: this.stateMachine.stateMachineArn,
      },
      logRetention: RetentionDays.ONE_DAY,
    });

    const quoteSubmittedRule = new Rule(this, 'QuoteSubmittedRule', {
      eventBus: props.loanBrokerEventBus,
      eventPattern: QUOTE_SUBMITTED_PATTERN_V1,
    });

    quoteSubmittedRule.addTarget(
      new LambdaFunctionTarget(requestHandlerFunction)
    );

    this.stateMachine.grantStartExecution(requestHandlerFunction);

    // Callback handler function

    const callbackHandlerFunction = new NodejsFunction(
      this,
      'CallbackHandler',
      {
        environment: {
          [STATE_MACHINE_ARN]: this.stateMachine.stateMachineArn,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    const loanBrokerCallbackRule = new Rule(this, id, {
      eventBus: props.loanBrokerEventBus,
      eventPattern: LOAN_BROKER_CALLBACK_PATTERN_V1,
    });

    loanBrokerCallbackRule.addTarget(
      new LambdaFunctionTarget(callbackHandlerFunction)
    );

    this.stateMachine.grantTaskResponse(callbackHandlerFunction);
  }

  private getStateMachine({
    creditReportRequesterFunction,
    lenderLookupFunction,
    rateRequesterFunction,
    responseSenderFunction,
    loanBrokerEventBus,
  }: {
    creditReportRequesterFunction: NodejsFunction;
    lenderLookupFunction: NodejsFunction;
    rateRequesterFunction: NodejsFunction;
    responseSenderFunction: NodejsFunction;
    loanBrokerEventBus: IEventBus;
  }): IChainable {
    return (
      new StateMachineBuilder()

        .lambdaInvokeWaitForTaskToken('RequestCreditReport', {
          lambdaFunction: creditReportRequesterFunction,
          parameters: {
            'state.$': '$',
          },
          resultPath: '$.creditReportReceivedData',
          timeout: Duration.seconds(10),
          catches: [
            {
              // https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
              errors: ['States.Timeout', 'States.TaskFailed'],
              handler: 'HandleCreditReportFailure',
            },
          ],
        })

        .lambdaInvoke('LookupLenders', {
          lambdaFunction: lenderLookupFunction,
        })

        .map('RequestRates', {
          // https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-map-state.html
          itemsPath: '$.lenders',
          parameters: {
            'lender.$': '$$.Map.Item.Value',
            'quoteSubmitted.$': '$.quoteSubmitted',
            'creditReportReceivedData.$': '$.creditReportReceivedData',
          },
          iterator: new StateMachineBuilder()

            .lambdaInvokeWaitForTaskToken('RequestRate', {
              lambdaFunction: rateRequesterFunction,
              parameters: {
                'quoteSubmitted.$': '$.quoteSubmitted',
                'creditReportReceivedData.$': '$.creditReportReceivedData',
                'lender.$': '$.lender',
              },
              timeout: Duration.seconds(10),
              catches: [
                {
                  errors: ['States.Timeout', 'States.TaskFailed'],
                  handler: 'HandleRateFailure',
                },
              ],
            })
            .end()

            .pass('HandleRateFailure')
            // TODO 27Dec22: Publish a rate failure event
            .end(),

          resultPath: '$.lenderRatesReceivedData', // TODO 27Dec22: How does this work when we have a failure?
        })

        .lambdaInvoke('SendResponse', {
          lambdaFunction: responseSenderFunction,
        })
        .end()

        .pass('HandleCreditReportFailure')
        // https://docs.aws.amazon.com/step-functions/latest/dg/connect-eventbridge.html
        .perform(
          new EventBridgePutEvents(this, 'PutEventCreditReportFailed', {
            entries: [
              {
                eventBus: loanBrokerEventBus,
                detailType: EventType.CreditReportFailed,
                source: `${EventDomain.LoanBroker}.${EventService.LoanBroker}`,
                detail: TaskInput.fromObject({
                  metadata: {
                    domain: EventDomain.LoanBroker,
                    service: EventService.LoanBroker,
                    eventType: EventType.CreditReportFailed,
                    eventVersion: '1.0',
                    'correlationId.$':
                      '$$.Execution.Input.quoteSubmitted.metadata.correlationId',
                    'requestId.$':
                      '$$.Execution.Input.quoteSubmitted.metadata.requestId',
                    'timestamp.$': '$$.State.EnteredTime',
                  },
                  data: {
                    'quoteReference.$':
                      '$$.Execution.Input.quoteSubmitted.data.quoteReference',
                    'stateMachineId.$': '$$.StateMachine.Id',
                    'executionId.$': '$$.Execution.Id',
                    'executionStartTime.$': '$$.Execution.StartTime',
                  },
                }),
              },
            ],
          })
        )
        .fail('CreditReportFailure')

        .build(this, {
          defaultProps: {
            lambdaInvoke: {
              payloadResponseOnly: true,
            },
          },
        })
    );
  }
}
