import chalk from "chalk";
import fs from "fs";
import path from "path";
import type { ErrorService } from "../services/error.service";
import { FFmpegService } from "../services/ffmpeg.service";
import type { UserInputService } from "../services/user-input.service";

export class AdaptiveHLSVideoConversionHandler {
  constructor(
    private readonly userInputService: UserInputService,
    private readonly ffmpegService: FFmpegService,
    private readonly errorService: ErrorService
  ) {}

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

      await this.ffmpegService.convertToHLS(
        inputPath,
        outputDir,
        selectedResolutions,
        bitrates
      );

      console.log(chalk.green("✅ Adaptive HLS conversion complete!"));
    } catch (error) {
      this.errorService.handleError(error, "Adaptive HLS conversion Error");
    }
  }
}
