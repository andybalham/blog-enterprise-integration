import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import {
  Chain,
  Fail,
  IntegrationPattern,
  IStateMachine,
  JsonPath,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, SnsPublish } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ValuationCallbackFunctionEnv } from './LoanProcessor.ValuationCallbackFunction';
import { ValuationRequestFunctionEnv } from './LoanProcessor.ValuationRequestFunction';

export interface LoanProcessorProps {
  valuationServiceUrl: string;
}

export default class LoanProcessor extends Construct {
  readonly stateMachine: IStateMachine;

  readonly errorTopic: ITopic;

  static readonly VALUATION_SERVICE_TIMED_OUT_ERROR =
    'ValuationServiceTimedOut';

  static readonly VALUATION_SERVICE_TIMED_OUT_ERROR_DESCRIPTION =
    'The valuation service timed out';

  static readonly VALUATION_FAILED_ERROR = 'ValuationFailed';

  static readonly VALUATION_FAILED_ERROR_DESCRIPTION = 'The valuation failed';

  constructor(scope: Construct, id: string, props: LoanProcessorProps) {
    super(scope, id);

    const taskTokenTable = new Table(this, 'TaskTokenTable', {
      partitionKey: { name: 'keyReference', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const valuationCallbackApi = new HttpApi(this, 'ValuationCallbackApi', {
      description: 'Valuation Callback API',
    });

    const VALUATION_CALLBACK_PATH = 'valuation-callback';

    const valuationRequestFunction = new NodejsFunction(
      this,
      'ValuationRequestFunction',
      {
        environment: {
          [ValuationRequestFunctionEnv.SERVICE_URL]: props.valuationServiceUrl,
          [ValuationRequestFunctionEnv.CALLBACK_URL]: `${valuationCallbackApi.url}${VALUATION_CALLBACK_PATH}`,
          [ValuationRequestFunctionEnv.TASK_TOKEN_TABLE_NAME]:
            taskTokenTable.tableName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    taskTokenTable.grantWriteData(valuationRequestFunction);

    const requestValuationTask = new LambdaInvoke(this, 'RequestValuation', {
      lambdaFunction: valuationRequestFunction,
      integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: TaskInput.fromObject({
        taskToken: JsonPath.taskToken,
        'loanApplication.$': '$',
      }),
      heartbeat: Duration.seconds(10),
      timeout: Duration.seconds(30),
    });

    this.errorTopic = new Topic(this, 'ErrorTopic');

    const handleValuationServiceTimeout = new SnsPublish(
      this,
      'PublishValuationServiceTimeoutError',
      {
        topic: this.errorTopic,
        message: TaskInput.fromObject({
          description:
            LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR_DESCRIPTION,
          'ExecutionId.$': '$$.Execution.Id',
          'ExecutionStartTime.$': '$$.Execution.StartTime',
        }),
      }
    ).next(
      new Fail(this, 'ValuationServiceTimedOut', {
        error: LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR,
      })
    );

    const handleValuationFailed = new SnsPublish(
      this,
      'PublishValuationFailedError',
      {
        topic: this.errorTopic,
        message: TaskInput.fromObject({
          description: LoanProcessor.VALUATION_FAILED_ERROR_DESCRIPTION,
          'ExecutionId.$': '$$.Execution.Id',
          'ExecutionStartTime.$': '$$.Execution.StartTime',
        }),
      }
    ).next(
      new Fail(this, 'ValuationFailed', {
        error: LoanProcessor.VALUATION_FAILED_ERROR,
      })
    );

    this.stateMachine = new StateMachine(this, 'LoanProcessorStateMachine', {
      definition: Chain.start(
        requestValuationTask
          .addCatch(handleValuationServiceTimeout, {
            errors: ['States.Timeout'],
          })
          .addCatch(handleValuationFailed, {
            errors: ['ValuationFailed'],
          })
      ),
    });

    const valuationCallbackFunction = new NodejsFunction(
      this,
      'ValuationCallbackFunction',
      {
        environment: {
          [ValuationCallbackFunctionEnv.TASK_TOKEN_TABLE_NAME]:
            taskTokenTable.tableName,
          [ValuationCallbackFunctionEnv.ERROR_TOPIC_ARN]:
            this.errorTopic.topicArn,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    taskTokenTable.grantReadData(valuationCallbackFunction);
    this.stateMachine.grantTaskResponse(valuationCallbackFunction);
    this.errorTopic.grantPublish(valuationCallbackFunction);

    valuationCallbackApi.addRoutes({
      path: `/${VALUATION_CALLBACK_PATH}`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'ValuationCallbackIntegration',
        valuationCallbackFunction
      ),
    });
  }
}
