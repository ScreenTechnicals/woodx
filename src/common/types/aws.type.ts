import type { BucketLocationConstraint } from "@aws-sdk/client-s3";

export type AWSConfig = {
    outputBucketName: string;
    region: BucketLocationConstraint;
    accessKeyId: string;
    secretAccessKey: string;
};