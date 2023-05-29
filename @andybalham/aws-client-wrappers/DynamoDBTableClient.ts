/* eslint-disable max-classes-per-file */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  DynamoDBClient,
  PutItemInput,
  QueryInput as AwsQueryInput,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Agent } from 'https';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

const agent = new Agent({
  keepAlive: true,
});

const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    requestHandler: new NodeHttpHandler({
      httpAgent: agent,
    }),
  })
);

export interface DynamoDBTableProps {
  partitionKeyName: string;
  sortKeyName: string;
}

export interface DynamoDBTableClientProps extends DynamoDBTableProps {
  tableName?: string;
  documentClientOverride?: DynamoDBDocumentClient;
}

export interface QueryInput
  extends Omit<
    AwsQueryInput,
    'TableName' | 'KeyConditionExpression' | 'ExpressionAttributeValues'
  > {
  partitionKeyValue: string | number;
  // sortKeyOperation?: SortKeyOperation;
  // sortKeyValue?: string | number;
  // sortKeyRange?: {from: string, to: string} | {from: number, to: number} ;
  ExpressionAttributeValues?: Record<string, any>;
}

/**
 * Provides a wrapper around `DocumentClient` for a specific table.
 */
export class DynamoDBTableClient {
  documentClient: DynamoDBDocumentClient;

  constructor(public readonly props: DynamoDBTableClientProps) {
    this.documentClient = props.documentClientOverride ?? documentClient;
  }

  public get tableName(): string {
    if (this.props.tableName === undefined) {
      throw new Error('this.props.tableName === undefined');
    }
    return this.props.tableName;
  }

  async putAsync(item: Record<string, any>): Promise<void> {
    const putItem: PutItemInput = {
      TableName: this.tableName,
      Item: item,
    };

    await this.documentClient.send(new PutCommand(putItem));
  }

  async queryAllAsync<T>(queryInput: QueryInput): Promise<T[]> {
    const queryParams /*: AwsQueryInput */ = {
      ...queryInput,
      TableName: this.tableName,
      KeyConditionExpression: `${this.props.partitionKeyName} = :partitionKey`,
    };

    /*
    You use ranges with sort keys to create queries. The following operators are available with the KeyConditionExpressions query:
        =
        <
        >
        <=
        >=
        between
        begins_with
    */

    let concatenatedItems: T[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ':partitionKey': queryInput.partitionKeyValue,
      };

      queryParams.ExclusiveStartKey = lastEvaluatedKey;

      // eslint-disable-next-line no-await-in-loop
      const queryOutput = await this.documentClient.send(
        new QueryCommand(queryParams)
      );

      const queryItems = queryOutput.Items?.map((i) => i as unknown as T) ?? [];

      concatenatedItems = concatenatedItems.concat(queryItems);

      lastEvaluatedKey = queryOutput.LastEvaluatedKey;
      //
    } while (lastEvaluatedKey !== undefined);

    return concatenatedItems;
  }
}

/**
 * A factory for building clients for a specific DynamoDB table.
 */
export class DynamoDBTableClientFactory {
  constructor(public readonly props: DynamoDBTableProps) {}

  /**
   * Build a client for accessing the DynamoDB table.
   * @tableName The name of the DynamoDb table.
   * @param documentClientOverride An optional override for the `DocumentClient` to use.
   * @returns A client instance for the DynamoDB table.
   */
  build(
    tableName?: string,
    documentClientOverride?: DynamoDBDocumentClient
  ): DynamoDBTableClient {
    return new DynamoDBTableClient({
      ...this.props,
      tableName,
      documentClientOverride,
    });
  }
}