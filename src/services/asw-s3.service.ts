import {
    CreateBucketCommand,
    ListBucketsCommand,
    PutObjectCommand,
    S3Client
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import type { AWSConfig } from "../common/types/aws.type";

export class AwsS3Service {
    private s3?: S3Client;

    public async setupS3(config: AWSConfig): Promise<void> {
        const missingFields = [];
        if (!config.bucketName) missingFields.push("bucketName");
        if (!config.region) missingFields.push("region");
        if (!config.accessKeyId) missingFields.push("accessKeyId");
        if (!config.secretAccessKey) missingFields.push("secretAccessKey");

        if (missingFields.length > 0) {
            console.error(`❌ Configuration is incomplete! Missing: ${missingFields.join(", ")}`);
            throw new Error(`Missing required configuration: ${missingFields.join(", ")}`);
        }

        try {
            this.s3 = new S3Client({
                credentials: {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                },
                region: config.region,
            });

            const listBucketsResponse = await this.s3.send(new ListBucketsCommand({}));
            const bucketExists = listBucketsResponse.Buckets?.some(
                (bucket) => bucket.Name === config.bucketName
            );

            if (bucketExists) {
                console.log(`✅ Bucket "${config.bucketName}" already exists.`);
            } else {
                await this.s3.send(
                    new CreateBucketCommand({
                        Bucket: config.bucketName,
                        // CreateBucketConfiguration: { LocationConstraint: config.region },
                    })
                );
                console.log(`🚀 Bucket "${config.bucketName}" created successfully.`);
            }
        } catch (error) {
            const err = error as Error & { code?: string };
            throw new Error(`S3 Setup Failed: ${err.code || "Unknown"} - ${err.message}`);
        }
    }

    public async uploadFile(
        bucketName: string,
        key: string,
        body: Buffer | Readable
    ): Promise<void> {
        if (!this.s3) {
            throw new Error("S3 client not initialized");
        }

        try {
            let contentType: string;
            if (key.endsWith(".m3u8")) {
                contentType = "application/vnd.apple.mpegurl";
            } else if (key.endsWith(".ts")) {
                contentType = "video/MP2T";
            } else {
                contentType = "application/octet-stream";
                console.warn(`⚠️ Unknown file type for ${key}, using default content type`);
            }

            await this.s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                })
            );
            console.log(`✅ Successfully uploaded ${key} to ${bucketName}`);
        } catch (error) {
            const err = error as Error & { code?: string };
            console.error(`❌ Failed to upload ${key} to ${bucketName}: ${err.message}`);
            throw new Error(`Upload failed: ${err.code || "Unknown"} - ${err.message}`);
        }
    }

    public getS3Client(): S3Client {
        if (!this.s3) {
            throw new Error("S3 client not initialized");
        }
        return this.s3;
    }
}