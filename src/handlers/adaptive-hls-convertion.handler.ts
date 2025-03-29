import chalk from "chalk";
import fs from "fs";
import path from "path";
import { YAML } from "zx";
import type { AWSConfig } from "../common/types/aws.type";
import type { AwsS3Service } from "../services/aws-s3.service";
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

  async run(): Promise<void> {
    console.log(chalk.blue("🔄 Starting adaptive HLS conversion..."));

    try {
      const videoDirectory = await this.userInputService.askForVideoDir();
      const resolvedDir = path.resolve(videoDirectory);

      if (!fs.existsSync(resolvedDir)) {
        throw new Error(`Directory does not exist: ${resolvedDir}`);
      }

      const files = fs.readdirSync(resolvedDir);
      const videoFiles = files.filter((file) => file.endsWith(".mp4"));

      if (videoFiles.length === 0) {
        throw new Error(`No .mp4 files found in ${resolvedDir}`);
      }

      const selectedVideos = await this.userInputService.askForVideoSelection(videoFiles);

      for (const selectedVideo of selectedVideos) {
        const inputPath = path.join(resolvedDir, selectedVideo);
        const folderName = await this.userInputService.askForOutputDirectory(selectedVideo);
        const outputDir = path.join(process.cwd(), "outputs", folderName);

        const selectedResolutions = await this.userInputService.askForMulipleResolutions();
        if (selectedResolutions.length === 0) {
          throw new Error("No resolutions selected. Exiting...");
        }

        const bitrates: Record<string, string> = {};
        for (const resolution of selectedResolutions) {
          const bitrate = await this.userInputService.askBitrate(resolution);
          bitrates[resolution] = bitrate;
        }

        const outputSpace = await this.userInputService.askForServiceSpace();

        switch (outputSpace.toLowerCase()) {
          case "local":
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
              console.log(chalk.gray(`Created local output directory: ${outputDir}`));
            }
            await this.ffmpegService.convertToHLS(inputPath, outputDir, selectedResolutions, bitrates);
            console.log(chalk.green(`✅ HLS conversion complete! Output saved to ${outputDir}`));
            break;

          case "aws s3 bucket":
            console.log(chalk.blue("🔧 Configuring AWS S3 upload..."));

            const configPath = path.join(process.cwd(), "s3.config.yml");
            let s3Config: AWSConfig;

            if (!fs.existsSync(configPath)) {
              console.log(chalk.yellow("⚠️ s3.config.yml not found. Prompting for configuration..."));
              s3Config = await this.userInputService.askForMissingS3Configs();
              const yamlContent = YAML.stringify(s3Config);
              fs.writeFileSync(configPath, yamlContent, "utf8");
              console.log(chalk.green("✅ s3.config.yml created successfully."));
            } else {
              const configContent = fs.readFileSync(configPath, "utf8");
              s3Config = YAML.parse(configContent) as AWSConfig;
              if (!s3Config.outputBucketName || !s3Config.region || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
                throw new Error("Missing required fields in s3.config.yml");
              }
            }

            await this.awsS3Service.setupS3(s3Config);

            const tempDir = path.join(process.cwd(), "outputs", folderName);
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            console.log(chalk.gray(`Creating temporary directory: ${tempDir}`));

            await this.ffmpegService.convertToHLS(inputPath, tempDir, selectedResolutions, bitrates);

            const s3Prefix = `woodx/outputs/${folderName}`;
            console.log(chalk.blue(`Uploading to S3 bucket: ${s3Config.outputBucketName}, prefix: ${s3Prefix}`));
            await this.awsS3Service.uploadDirectory(tempDir, s3Config.outputBucketName, s3Prefix);

            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(chalk.gray(`Deleted temporary directory: ${tempDir}`));
            console.log(chalk.green(`✅ HLS conversion and upload to S3 bucket '${s3Config.outputBucketName}' complete!`));
            break;

          default:
            throw new Error(`Unsupported output space: ${outputSpace}`);
        }
      }
    } catch (error) {
      this.errorService.handleError(error, "Adaptive HLS conversion Error");
    }
  }
}
