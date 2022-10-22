/* eslint-disable import/prefer-default-export */
import { RemovalPolicy } from 'aws-cdk-lib';
import { BucketProps } from 'aws-cdk-lib/aws-s3';

// We wouldn't set these in production

export const blogBucketProps: BucketProps = {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
};
