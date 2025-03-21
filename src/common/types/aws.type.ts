import type { BucketLocationConstraint } from "@aws-sdk/client-s3";

export type AWSConfig = {
    bucketName: string;
    region: BucketLocationConstraint;
    accessKeyId: string;
    secretAccessKey: string;
};