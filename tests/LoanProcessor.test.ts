/* eslint-disable no-console */
import {
  IntegrationTestClient,
  StepFunctionsTestClient,
  TestObservation,
} from '@andybalham/cdk-cloud-test-kit';
import { SNSEvent, SNSEventRecord } from 'aws-lambda';
import { nanoid } from 'nanoid';
import { LoanApplication } from '../src/LoanApplication';
import LoanProcessor from '../src/LoanProcessor';
import TaskTokenTestStack from '../src/TaskTokenTestStack';

jest.setTimeout(2 * 60 * 1000);

describe('TaskTokenTestStack Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: TaskTokenTestStack.Id,
  });

  let loanProcessorStateMachine: StepFunctionsTestClient;

  beforeAll(async () => {
    await testClient.initialiseClientAsync();

    loanProcessorStateMachine = testClient.getStepFunctionsTestClient(
      TaskTokenTestStack.LoanProcessorStateMachineId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('tests a prompt callback', async () => {
    // Arrange

    const loanApplication: LoanApplication = {
      applicationReference: `app-${nanoid()}`,
      property: {
        nameOrNumber: '999',
        postcode: 'PO1 1CE',
      },
    };

    // Act

    await loanProcessorStateMachine.startExecutionAsync(loanApplication);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => loanProcessorStateMachine.isExecutionFinishedAsync(),
    });

    // Assert

    expect(timedOut).toEqual(false);

    const status = await loanProcessorStateMachine.getStatusAsync();

    expect(status).toEqual('SUCCEEDED');
  });

  it('tests a late callback', async () => {
    // Arrange

    const loanApplication: LoanApplication = {
      applicationReference: `app-${nanoid()}`,
      property: {
        nameOrNumber: 'Late callback',
        postcode: 'PO1 1CE',
      },
    };

    // Act

    await loanProcessorStateMachine.startExecutionAsync(loanApplication);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        (await loanProcessorStateMachine.isExecutionFinishedAsync()) &&
        o.length > 0,
      intervalSeconds: 10,
      timeoutSeconds: 60,
    });

    // Assert

    expect(timedOut).toEqual(false);

    const status = await loanProcessorStateMachine.getStatusAsync();

    expect(status).toEqual('FAILED');

    const lastEvent = await loanProcessorStateMachine.getLastEventAsync();

    expect(
      lastEvent?.executionFailedEventDetails?.error ===
        LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR
    ).toBeTruthy();

    const testObservations = await testClient.getTestObservationsAsync();

    const errorRecords = TestObservation.getEventRecords<
      SNSEvent,
      SNSEventRecord
    >(
      TestObservation.filterById(
        testObservations,
        TaskTokenTestStack.ErrorTopicObserverId
      )
    );

    const errorMessage = JSON.parse(errorRecords[0].Sns.Message);

    expect(errorMessage.description).toBe(
      LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR_DESCRIPTION
    );
    expect(errorMessage.ExecutionId).toBeDefined();
    expect(errorMessage.ExecutionStartTime).toBeDefined();
  });

  it('tests no callback', async () => {
    // Arrange

    const loanApplication: LoanApplication = {
      applicationReference: `app-${nanoid()}`,
      property: {
        nameOrNumber: 'No callback',
        postcode: 'PO1 1CE',
      },
    };

    // Act

    await loanProcessorStateMachine.startExecutionAsync(loanApplication);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        (await loanProcessorStateMachine.isExecutionFinishedAsync()) &&
        o.length > 0,
      intervalSeconds: 10,
      timeoutSeconds: 90,
    });

    // Assert

    expect(timedOut).toEqual(false);

    const status = await loanProcessorStateMachine.getStatusAsync();

    expect(status).toEqual('FAILED');

    const lastEvent = await loanProcessorStateMachine.getLastEventAsync();

    expect(
      lastEvent?.executionFailedEventDetails?.error ===
        LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR
    ).toBeTruthy();
  });

  it('tests unknown reference', async () => {
    // Arrange

    const loanApplication: LoanApplication = {
      applicationReference: `app-${nanoid()}`,
      property: {
        nameOrNumber: 'Unknown reference',
        postcode: 'PO1 1CE',
      },
    };

    // Act

    await loanProcessorStateMachine.startExecutionAsync(loanApplication);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        (await loanProcessorStateMachine.isExecutionFinishedAsync()) &&
        o.length > 1,
      intervalSeconds: 10,
      timeoutSeconds: 60,
    });

    // Assert

    expect(timedOut).toEqual(false);

    const status = await loanProcessorStateMachine.getStatusAsync();

    expect(status).toEqual('FAILED');

    const lastEvent = await loanProcessorStateMachine.getLastEventAsync();

    expect(
      lastEvent?.executionFailedEventDetails?.error ===
        LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR
    ).toBeTruthy();

    const testObservations = await testClient.getTestObservationsAsync();

    const errorRecords = TestObservation.getEventRecords<
      SNSEvent,
      SNSEventRecord
    >(
      TestObservation.filterById(
        testObservations,
        TaskTokenTestStack.ErrorTopicObserverId
      )
    );

    expect(errorRecords.length).toBeGreaterThan(1);

    const hasTimedOutError = errorRecords.some((r) => {
      const message = JSON.parse(r.Sns.Message);
      return (
        message.description ===
        LoanProcessor.VALUATION_SERVICE_TIMED_OUT_ERROR_DESCRIPTION
      );
    });

    expect(hasTimedOutError).toBeTruthy();

    const hasUnknownReferenceError = errorRecords.some((r) => {
      const message = JSON.parse(r.Sns.Message);
      return message.description === 'Unknown valuation reference';
    });

    expect(hasUnknownReferenceError).toBeTruthy();
  });

  it('tests failed response', async () => {
    // Arrange

    const loanApplication: LoanApplication = {
      applicationReference: `app-${nanoid()}`,
      property: {
        nameOrNumber: 'Failed response',
        postcode: 'PO1 1CE',
      },
    };

    // Act

    await loanProcessorStateMachine.startExecutionAsync(loanApplication);

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        (await loanProcessorStateMachine.isExecutionFinishedAsync()) &&
        o.length > 0,
      intervalSeconds: 10,
      timeoutSeconds: 90,
    });

    // Assert

    expect(timedOut).toEqual(false);

    const status = await loanProcessorStateMachine.getStatusAsync();

    expect(status).toEqual('FAILED');

    const lastEvent = await loanProcessorStateMachine.getLastEventAsync();

    expect(
      lastEvent?.executionFailedEventDetails?.error ===
        LoanProcessor.VALUATION_FAILED_ERROR
    ).toBeTruthy();

    const testObservations = await testClient.getTestObservationsAsync();

    const errorRecords = TestObservation.getEventRecords<
      SNSEvent,
      SNSEventRecord
    >(
      TestObservation.filterById(
        testObservations,
        TaskTokenTestStack.ErrorTopicObserverId
      )
    );

    const errorMessage = JSON.parse(errorRecords[0].Sns.Message);

    expect(errorMessage.description).toBe(
      LoanProcessor.VALUATION_FAILED_ERROR_DESCRIPTION
    );
    expect(errorMessage.ExecutionId).toBeDefined();
    expect(errorMessage.ExecutionStartTime).toBeDefined();
  });
});
