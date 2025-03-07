import chalk from "chalk";
import fs from "fs";
import path from "path";
import { getUniqueName } from "../helpers/cli.helper";
import { ErrorService } from "../services/error.service";
import { FFmpegService } from "../services/ffmpeg.service";
import type { UserInputService } from "../services/user-input.service";

export class VideoMergeHandler {
  constructor(
    private readonly userInputService: UserInputService,
    private readonly ffmpegService: FFmpegService,
    private readonly errorService: ErrorService
  ) {}

  async run() {
    try {
      const videoDir = await this.userInputService.askForVideoDir();
      const videoFiles = this.getVideoFiles(videoDir);

      if (videoFiles.length < 2) {
        throw new Error("❌ At least 2 videos are required to merge.");
      }

      const selectedVideos = await this.userInputService.askForVideosToMerge(
        videoFiles
      );
      const format = await this.userInputService.askForFormat();
      const output = await this.userInputService.askForOutputFilename(
        getUniqueName("merged-video")
      );
      const outputFolder = path.join("outputs", output);

      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      const outputPath = path.join(outputFolder, `${output}.${format}`);
      const videoPaths = selectedVideos.map((file: string) =>
        path.join(videoDir, file)
      );

      console.log(chalk.yellow("🔄 Merging videos..."));

      await this.ffmpegService.mergeVideos(videoPaths, outputPath);

      console.log(chalk.green(`✅ Merge complete! Saved at: ${outputPath}`));
    } catch (error) {
      this.errorService.handleError(error, "Failed to merge videos.");
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
