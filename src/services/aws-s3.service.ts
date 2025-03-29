import {
    CreateBucketCommand,
    ListBucketsCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import chalk from "chalk";
import fs from "fs";
import mime from "mime-types";
import path from "path";
import type { AWSConfig } from "../common/types/aws.type";

export class AwsS3Service {
    private s3?: S3Client;

    /** Initialize the S3 client and ensure the bucket exists */
    public async setupS3(config: AWSConfig): Promise<void> {
        const missingFields = [];
        if (!config.outputBucketName) missingFields.push("bucketName");
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
                (bucket) => bucket.Name === config.outputBucketName
            );

            if (bucketExists) {
                console.log(`✅ Bucket "${config.outputBucketName}" already exists.`);
            } else {
                await this.s3.send(
                    new CreateBucketCommand({
                        Bucket: config.outputBucketName,
                    })
                );
                console.log(`🚀 Bucket "${config.outputBucketName}" created successfully.`);
            }
        } catch (error) {
            const err = error as Error;
            throw new Error(`S3 Setup Failed: ${err.message}`);
        }
    }

    /** Upload a single file to S3 with retries and proper content type */
    public async uploadFile(
        bucketName: string,
        key: string,
        filePath: string, // Changed to accept file path instead of body
        retries = 3
    ): Promise<void> {
        if (!this.s3) {
            throw new Error("S3 client not initialized");
        }

        const contentType = mime.lookup(key) || "application/octet-stream";
        if (contentType === "application/octet-stream") {
            console.warn(chalk.yellow(`⚠️ Unknown file type for ${key}, using default content type`));
        }

        const buffer = fs.readFileSync(filePath); // Load file into Buffer

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.s3.send(
                    new PutObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                        Body: buffer,
                        ContentType: contentType,
                    })
                );
                console.log(chalk.gray(`✅ Successfully uploaded ${key} to ${bucketName}`));
                return;
            } catch (error) {
                const err = error as Error & { code?: string, $metadata?: { httpStatusCode?: number } };
                console.error(
                    chalk.red(
                        `❌ Failed to upload ${key} (attempt ${attempt}/${retries}): ${err.message} (Code: ${err.code || "Unknown"}, Status: ${err.$metadata?.httpStatusCode || "N/A"})`
                    )
                );
                if (attempt === retries) {
                    throw new Error(`Upload failed after ${retries} attempts: ${err.message}`);
                }
                await new Promise((res) => setTimeout(res, 1000 * attempt));
            }
        }
    }

    /** Upload all files in a directory (including subdirectories) to S3 */
    public async uploadDirectory(localDir: string, bucketName: string, s3Prefix: string): Promise<void> {
        if (!fs.existsSync(localDir)) {
            throw new Error(`Directory ${localDir} does not exist`);
        }

        const uploadRecursive = async (currentDir: string, currentPrefix: string) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const s3Key = path.join(currentPrefix, entry.name).replace(/\\/g, "/");

                if (entry.isDirectory()) {
                    await uploadRecursive(fullPath, s3Key);
                } else if (entry.isFile()) {
                    await this.uploadFile(bucketName, s3Key, fullPath); // Pass file path directly
                    console.log(chalk.gray(`Uploaded ${entry.name} to S3: ${s3Key}`));
                }
            }
        };

        await uploadRecursive(localDir, s3Prefix);
    }

    /** Get the initialized S3 client */
    public getS3Client(): S3Client {
        if (!this.s3) {
            throw new Error("S3 client not initialized");
        }
        return this.s3;
    }
}