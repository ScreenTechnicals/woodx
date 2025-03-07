import chalk from "chalk";
import fs from "fs";
import path from "path";
import { defaultVideoConfig } from "../configs/default-video.config";
import { getUniqueName } from "../helpers/cli.helper";
import { ErrorService } from "../services/error.service";
import { FFmpegService } from "../services/ffmpeg.service";
import type { UserInputService } from "../services/user-input.service";

export class VideoConversionHandler {
  constructor(
    private readonly userInputService: UserInputService,
    private readonly ffmpegService: FFmpegService,
    private readonly errorService: ErrorService
  ) {}

  async run() {
    try {
      const videoDir = await this.userInputService.askForVideoDir();
      if (!fs.existsSync(videoDir)) {
        throw new Error("❌ Directory does not exist.");
      }

      const videoFiles = this.getVideoFiles(videoDir);
      if (videoFiles.length === 0) {
        throw new Error("❌ No video files found.");
      }

      const input = await this.userInputService.askForVideoSelection(
        videoFiles
      );
      const defaultName = path.basename(input, path.extname(input));
      const format = await this.userInputService.askForFormat();
      const resolution = await this.userInputService.askForResolution();
      const output = await this.userInputService.askForOutputFilename(
        getUniqueName(defaultName)
      );

      const inputPath = path.join(videoDir, input);
      if (!fs.existsSync(inputPath)) {
        throw new Error("❌ Selected file does not exist.");
      }

      const baseName = output || defaultName;

      const outputFolder = path.join(
        defaultVideoConfig.output,
        baseName,
        resolution
      );
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      const outputPath = path.join(outputFolder, `${baseName}.${format}`);

      console.log(chalk.yellow("🔄 Converting..."));

      await this.ffmpegService.convertVideo(inputPath, outputPath, {
        format,
        output,
        resolution,
      });

      console.log(
        chalk.green(`✅ Conversion complete! Saved at: ${outputPath}`)
      );
    } catch (error) {
      this.errorService.handleError(error, "Failed to convert video.");
    }
  }

  private getVideoFiles(videoDir: string): string[] {
    try {
      return fs
        .readdirSync(videoDir)
        .filter((file) => file.match(/\.(mp4|mkv|avi|mov|webm|flv)$/));
    } catch (error) {
      throw new Error("❌ Failed to read directory.");
    }
  }
}
