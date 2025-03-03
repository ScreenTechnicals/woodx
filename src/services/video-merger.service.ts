import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { CLIHelper } from "../helpers/cli.helper";
import { FFmpegUtil } from "../utils/ffmpeg-cli.util";
import { ErrorService } from "./error.service";

export class VideoMerger {
  private videoDir!: string;

  async run() {
    try {
      this.videoDir = await CLIHelper.askForVideoDir();
      const videoFiles = this.getVideoFiles();

      if (videoFiles.length < 2) {
        console.log(chalk.red("❌ At least 2 videos are required to merge."));
        return;
      }

      const { selectedVideos } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedVideos",
          message: "📽️ Select videos to merge:",
          choices: videoFiles,
          validate: (input) =>
            input.length < 2 ? "Select at least 2 videos!" : true,
        },
      ]);

      const { format, output } = await inquirer.prompt([
        {
          type: "list",
          name: "format",
          message: "📀 Choose format:",
          choices: ["mp4", "mkv"],
          default: "mp4",
        },
        {
          type: "input",
          name: "output",
          message: "💾 Output filename (without extension):",
          default: "merged-video",
        },
      ]);

      const outputPath = path.join("outputs", `${output}.${format}`);
      const videoPaths = selectedVideos.map((file: any) =>
        path.join(this.videoDir, file)
      );

      await FFmpegUtil.mergeVideos(videoPaths, outputPath);
    } catch (error) {
      ErrorService.handleError(error, "Failed to merge videos.");
    }
  }

  private getVideoFiles(): string[] {
    return fs
      .readdirSync(this.videoDir)
      .filter((file) => file.match(/\.(mp4|mkv|avi|mov|webm|flv)$/));
  }
}
