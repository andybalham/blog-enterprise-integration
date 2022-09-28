import { S3 } from 'aws-sdk';
import { GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { QuoteRequest } from '../domain/domain-models';

const s3 = new S3();

export default class LoanBrokerFileStore {
  constructor(public bucketName?: string) {}

  async putQuoteRequestAsync(
    quoteReference: string,
    quoteRequest: QuoteRequest
  ): Promise<string> {
    //
    const key = LoanBrokerFileStore.getQuoteRequestKey(quoteReference);

    const putObjectRequest: PutObjectRequest = {
      ...this.getS3Params(key),
      Body: JSON.stringify(quoteRequest),
    };

    await s3.putObject(putObjectRequest).promise();

    return key;
  }

  async getQuoteRequestAsync(quoteReference: string): Promise<QuoteRequest> {
    //
    const key = LoanBrokerFileStore.getQuoteRequestKey(quoteReference);

    const getObjectRequest: GetObjectRequest = {
      ...this.getS3Params(key),
    };

    const obj = await s3.getObject(getObjectRequest).promise();

    if (obj?.Body === undefined) throw new Error('obj?.Body === undefined');

    const quoteRequest = JSON.parse(obj.Body?.toString());

    return quoteRequest;
  }

  private getS3Params(key: string): {
    Bucket: string;
    Key: string;
  } {
    if (this.bucketName === undefined)
      throw new Error('this.bucketName === undefined');

    const s3Params = {
      Bucket: this.bucketName,
      Key: key,
    };
    return s3Params;
  }

  private static getQuoteRequestKey(quoteReference: string): string {
    return `${quoteReference}/${quoteReference}-quote-request.json`;
  }
}
