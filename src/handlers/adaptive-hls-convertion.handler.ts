import chalk from "chalk";
import fs from "fs";
import path from "path";
import { YAML } from "zx";
import type { AWSConfig } from "../common/types/aws.type";
import type { AwsS3Service } from "../services/asw-s3.service";
import type { ErrorService } from "../services/error.service";
import { FFmpegService } from "../services/ffmpeg.service";
import type { UserInputService } from "../services/user-input.service";

export class AdaptiveHLSVideoConversionHandler {
  constructor(
    private readonly userInputService: UserInputService,
    private readonly ffmpegService: FFmpegService,
    private readonly awsS3Service: AwsS3Service,
    private readonly errorService: ErrorService
  ) { }

  async run() {
    console.log(chalk.blue("🔄 Starting adaptive HLS conversion..."));

    try {
      const videoDirectory = await this.userInputService.askForVideoDir();
      const resolvedDir = path.resolve(videoDirectory);

      if (!fs.existsSync(resolvedDir)) {
        throw new Error("❌ Directory does not exist.");
      }

      const files = fs.readdirSync(resolvedDir);
      const videoFiles = files.filter((file) => file.endsWith(".mp4"));

      if (videoFiles.length === 0) {
        throw new Error("❌ No video files found in the directory.");
      }

      const selectedVideo = await this.userInputService.askForVideoSelection(
        videoFiles
      );
      const inputPath = path.join(resolvedDir, selectedVideo);
      const folderName = await this.userInputService.askForOutputDirectory(
        selectedVideo
      );
      const outputDir = path.join(process.cwd(), "outputs", folderName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const selectedResolutions =
        await this.userInputService.askForMulipleResolutions();

      if (selectedResolutions.length === 0) {
        throw new Error("❌ No resolutions selected. Exiting...");
      }

      const bitrates: Record<string, string> = {};
      for (const resolution of selectedResolutions) {
        const bitrate = await this.userInputService.askBitrate(resolution);

        bitrates[resolution] = bitrate;
      }
      const outputSpace = await this.userInputService.askForServiceSpace();

      switch (outputSpace) {
        case 'local':
          await this.ffmpegService.convertToHLS(
            inputPath,
            outputDir,
            selectedResolutions,
            bitrates
          );

          console.log(chalk.green("✅ Adaptive HLS conversion complete!"));
          break
        case 'aws s3 bucket':
          console.log(chalk.blue("🔧 Configuring AWS S3 upload..."));

          const configPath = path.join(process.cwd(), "s3.config.yml");
          let s3Config: AWSConfig;

          if (!fs.existsSync(configPath)) {
            console.log(chalk.yellow("⚠️ s3.config.yml not found. Let’s create it."));

            s3Config = await this.userInputService.askForMissingS3Configs();
            const yamlContent = YAML.stringify(s3Config);
            fs.writeFileSync(configPath, yamlContent, "utf8");

            console.log(chalk.green("✅ s3.config.yml created successfully."));
          } else {
            const configContent = fs.readFileSync(configPath, "utf8");
            s3Config = YAML.parse(configContent) as AWSConfig;

            if (!s3Config.bucketName) {
              throw new Error("❌ Bucket name not specified in s3.config.yml.");
            }

            if (!s3Config.region) {
              throw new Error("❌ Region not specified in s3.config.yml.");
            }

            if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
              throw new Error("❌ AWS credentials missing in s3.config.yml.");
            }

            await this.awsS3Service.setupS3(s3Config)
            const s3Prefix = `woodx/outputs/${folderName}`;
            console.log(chalk.blue("🔄 Converting and uploading to S3..."));
            await this.ffmpegService.convertToHLS(
              inputPath,
              "", // outputDir ignored for S3
              selectedResolutions,
              bitrates,
              true, // Enable S3 streaming mode
              async (fileName: string, data: Buffer) => {
                const s3Key = `${s3Prefix}/${fileName}`;
                await this.awsS3Service.uploadFile(s3Config.bucketName, s3Key, data);
                console.log(chalk.gray(`Uploaded ${fileName} to S3`));
              }
            );

            console.log(
              chalk.green(
                `✅ HLS conversion and upload to S3 bucket '${s3Config.bucketName}' complete!`
              )
            );
          }
          break
      }

    } catch (error) {
      this.errorService.handleError(error, "Adaptive HLS conversion Error");
    }
  }
}
