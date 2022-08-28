This is a companion repo for the blog post TODO

We need to add the following to the definition:

```TypeScript
      heartbeat: Duration.seconds(10),
      timeout: Duration.seconds(30),
```

Then we can test the timeout:

```json
{
  "errorType": "TaskTimedOut",
  "errorMessage": "Task Timed Out: 'Provided task does not exist anymore'",
  "code": "TaskTimedOut",
  "message": "Task Timed Out: 'Provided task does not exist anymore'",
  "time": "2022-07-26T18:21:39.968Z",
  "requestId": "9b5f54e3-9990-4c41-be67-9fda6c80c1f4",
  "statusCode": 400,
  "retryable": false,
  "retryDelay": 77.92116479734025,
  "stack": [
    "TaskTimedOut: Task Timed Out: 'Provided task does not exist anymore'",
    "    at Request.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/json.js:52:27)",
    "    at Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:106:20)",
    "    at Request.emit (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:78:10)",
    "    at Request.emit (/var/runtime/node_modules/aws-sdk/lib/request.js:686:14)",
    "    at Request.transition (/var/runtime/node_modules/aws-sdk/lib/request.js:22:10)",
    "    at AcceptorStateMachine.runTo (/var/runtime/node_modules/aws-sdk/lib/state_machine.js:14:12)",
    "    at /var/runtime/node_modules/aws-sdk/lib/state_machine.js:26:10",
    "    at Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:38:9)",
    "    at Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:688:12)",
    "    at Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:116:18)"
  ]
}
```

Links

- [Integrating AWS Step Functions callbacks and external systems](https://aws.amazon.com/blogs/compute/integrating-aws-step-functions-callbacks-and-external-systems/)
- https://github.com/aws-samples/aws-step-functions-callback-example
- https://dev.to/lukvonstrom/best-practices-for-using-aws-stepfunctions-2io#use-waitfortasktoken
