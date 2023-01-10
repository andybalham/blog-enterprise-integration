# Questions

- Should we have a separate CDK test app for each component?
  - Would this speed up test deployments?

# Stacks and Nested Stacks

https://docs.aws.amazon.com/cdk/v2/guide/stacks.html
https://bobbyhadz.com/blog/aws-cdk-nested-stack

# Power tools for Lambda

https://github.com/awslabs/aws-lambda-powertools-typescript

https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/logger/#usage

# Observability checklist

- Domain event pattern
- Lambda function to log all events, use insights to query
  - Should we just log the metadata? NO
  - [Bring your own formatter?](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/logger/#custom-log-formatter-bring-your-own-formatter)

```
fields @timestamp, eventType, data.quoteReference, correlationId, service, domain
| filter requestId like /62b7a371./
| sort @timestamp asc
| limit 20
```

# Runtime.ImportModuleError

Why are we getting the following? Is this the same issue? https://github.com/aws/aws-cdk/issues/14290

```json
{
  "errorType": "Runtime.ImportModuleError",
  "errorMessage": "Error: Cannot find module 'punycode/'\nRequire stack:\n- /var/task/index.js\n- /var/runtime/UserFunction.js\n- /var/runtime/Runtime.js\n- /var/runtime/index.js",
  "stack": [
    "Runtime.ImportModuleError: Error: Cannot find module 'punycode/'",
    "Require stack:",
    "- /var/task/index.js",
    "- /var/runtime/UserFunction.js",
    "- /var/runtime/Runtime.js",
    "- /var/runtime/index.js",
    "    at _loadUserApp (/var/runtime/UserFunction.js:221:13)",
    "    at Object.module.exports.load (/var/runtime/UserFunction.js:279:17)",
    "    at Object.<anonymous> (/var/runtime/index.js:43:34)",
    "    at Module._compile (internal/modules/cjs/loader.js:1085:14)",
    "    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1114:10)",
    "    at Module.load (internal/modules/cjs/loader.js:950:32)",
    "    at Function.Module._load (internal/modules/cjs/loader.js:790:12)",
    "    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:75:12)",
    "    at internal/main/run_main_module.js:17:47"
  ]
}
```

We solved the above by exposing the underlying functions, rather that the class.

# HTTP Headers

https://en.wikipedia.org/wiki/List_of_HTTP_header_fields

# CDK CLI

See 'Specifying the app command': https://docs.aws.amazon.com/cdk/v2/guide/cli.html

# Creating an event table

- Name: RequestEventLog
- PK: RequestId
- SK: Time#ShortId
- eventType
- metadata
- data
- expiryTime

