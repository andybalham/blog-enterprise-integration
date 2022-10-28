This is a companion repo for a series of blog posts on implementing a case study from [Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions](https://www.amazon.co.uk/Enterprise-Integration-Patterns-Designing-Addison-Wesley/dp/0321200683).

An overview of the application is shown below:

![Architecture diagram using EventBridge](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/ent-int-patterns-with-serverless-and-cdk/case-study-eventbridge.png?raw=true)

To build and deploy the application:

```
npm i
npm run cdk-deploy
```

To run the application, you need to post requests to to the `requests` endpoint outputted from the deployment, e.g.:

`POST https://fdri4bzhll.execute-api.eu-west-2.amazonaws.com/prod/requests`

```json
{
  "personalDetails": {
    "firstName": "Alex",
    "lastName": "Pritchard",
    "niNumber": "RD843356B",
    "address": {
      "lines": [
        "999 Letsby Avenue"
      ],
      "postcode": "RE4 8SD"
    }
  },
  "loanDetails": {
    "amount": 10000,
    "termMonths": 12
  }
}
```

To receive responses, you will need to create a `.env` file in the root directory that specifies the webhook that you want to receive them. For example:

```
WEBHOOK_URL=https://webhook.site/ec9ccd16-aa8e-4c6d-80b1-2a2beae805d8
```

To run the unit tests, you will need to amend the `.env` file to specify the region you have deployed to. For example:

```
AWS_REGION=eu-west-2
```

With this in place, you can deploy the test stacks and run the tests for the individual constructs using scripts from `package.json`. For example, the `LoanBroker` construct can be tested via the following two commands:

```
npm run test-loan-broker-deploy
npm run test-loan-broker
```