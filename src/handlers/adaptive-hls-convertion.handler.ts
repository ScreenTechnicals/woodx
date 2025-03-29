import chalk from "chalk";
import fs from "fs";
import path from "path";
import { YAML } from "zx";
import type { AWSConfig } from "../common/types/aws.type";
import type { Resolution } from "../common/types/video.type";
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

  /**
   * Main method to start the adaptive HLS conversion process.
   */
  async run(): Promise<void> {
    console.log(chalk.blue("🔄 Starting adaptive HLS conversion..."));

    try {
      const selectedVideoPaths = await this.getSelectedVideoPaths();
      for (const inputPath of selectedVideoPaths) {
        await this.processVideo(inputPath);
      }
    } catch (error) {
      this.errorService.handleError(error, "Adaptive HLS conversion Error");
    }
  }

  /**
   * Gets the video directory from the user, validates it, and returns the full paths of selected videos.
   * @returns Array of full paths to selected video files.
   */
  private async getSelectedVideoPaths(): Promise<string[]> {
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
    return selectedVideos.map((video) => path.join(resolvedDir, video));
  }

  /**
   * Processes a single video by gathering user inputs and handling the conversion based on output space.
   * @param inputPath Full path to the video file to process.
   */
  private async processVideo(inputPath: string): Promise<void> {
    const folderName = await this.userInputService.askForOutputDirectory(path.basename(inputPath));
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
        await this.handleLocalOutput(inputPath, folderName, selectedResolutions, bitrates);
        break;
      case "aws s3 bucket":
        await this.handleS3Output(inputPath, folderName, selectedResolutions, bitrates);
        break;
      default:
        throw new Error(`Unsupported output space: ${outputSpace}`);
    }
  }

  /**
   * Handles video conversion and saves the output to a local directory.
   * @param inputPath Full path to the input video file.
   * @param folderName Name of the output folder provided by the user.
   * @param resolutions Array of selected resolutions.
   * @param bitrates Record of bitrates for each resolution.
   */
  private async handleLocalOutput(
    inputPath: string,
    folderName: string,
    resolutions: Resolution[],
    bitrates: Record<string, string>
  ): Promise<void> {
    const outputDir = path.join(process.cwd(), "outputs", folderName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.gray(`Created local output directory: ${outputDir}`));
    }
    await this.ffmpegService.convertToHLS(inputPath, outputDir, resolutions, bitrates);
    console.log(chalk.green(`✅ HLS conversion complete! Output saved to ${outputDir}`));
  }

  /**
   * Handles video conversion, temporary storage, and upload to AWS S3.
   * @param inputPath Full path to the input video file.
   * @param folderName Name of the output folder provided by the user.
   * @param resolutions Array of selected resolutions.
   * @param bitrates Record of bitrates for each resolution.
   */
  private async handleS3Output(
    inputPath: string,
    folderName: string,
    resolutions: Resolution[],
    bitrates: Record<string, string>
  ): Promise<void> {
    console.log(chalk.blue("🔧 Configuring AWS S3 upload..."));

    const s3Config = await this.getS3Config();
    await this.awsS3Service.setupS3(s3Config);

    const tempDir = path.join(process.cwd(), "outputs", folderName);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    console.log(chalk.gray(`Creating temporary directory: ${tempDir}`));

    await this.ffmpegService.convertToHLS(inputPath, tempDir, resolutions, bitrates);

    const s3Prefix = `woodx/outputs/${folderName}`;
    console.log(chalk.blue(`Uploading to S3 bucket: ${s3Config.outputBucketName}, prefix: ${s3Prefix}`));
    await this.awsS3Service.uploadDirectory(tempDir, s3Config.outputBucketName, s3Prefix);

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(chalk.gray(`Deleted temporary directory: ${tempDir}`));
    console.log(chalk.green(`✅ HLS conversion and upload to S3 bucket '${s3Config.outputBucketName}' complete!`));
  }

  /**
   * Retrieves or creates the AWS S3 configuration.
   * @returns The AWS S3 configuration object.
   */
  private async getS3Config(): Promise<AWSConfig> {
    const configPath = path.join(process.cwd(), "s3.config.yml");
    if (!fs.existsSync(configPath)) {
      console.log(chalk.yellow("⚠️ s3.config.yml not found. Prompting for configuration..."));
      const s3Config = await this.userInputService.askForMissingS3Configs();
      const yamlContent = YAML.stringify(s3Config);
      fs.writeFileSync(configPath, yamlContent, "utf8");
      console.log(chalk.green("✅ s3.config.yml created successfully."));
      return s3Config;
    } else {
      const configContent = fs.readFileSync(configPath, "utf8");
      const s3Config = YAML.parse(configContent) as AWSConfig;
      if (!s3Config.outputBucketName || !s3Config.region || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
        throw new Error("Missing required fields in s3.config.yml");
      }
      return s3Config;
    }
  }
}