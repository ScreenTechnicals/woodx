import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { defaultVideoConfigs } from "../common/constants.common";
import { CLIHelper } from "../helpers/cli.helper";
import { FFmpegUtil } from "../utils/ffmpeg-cli.util";
import { ErrorService } from "./error.service";

export class VideoConverter {
  private videoDir!: string;

  async run() {
    try {
      this.videoDir = await CLIHelper.askForVideoDir();
      if (!fs.existsSync(this.videoDir)) {
        console.log(chalk.red("❌ Directory does not exist."));
        return;
      }

      const videoFiles = this.getVideoFiles();
      if (videoFiles.length === 0) {
        console.log(chalk.red("❌ No video files found."));
        return;
      }

      const { input } = await inquirer.prompt([
        {
          type: "list",
          name: "input",
          message: "🎬 Select a video file to convert:",
          choices: videoFiles,
        },
      ]);

      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "format",
          message: "📀 Choose output format:",
          choices: defaultVideoConfigs.videoFormats,
          default: defaultVideoConfigs.format,
        },
        {
          type: "list",
          name: "resolution",
          message: "🖥️ Select resolution:",
          choices: defaultVideoConfigs.videoResolutions,
          default: defaultVideoConfigs.resolution,
        },
        {
          type: "input",
          name: "output",
          message: "💾 Enter output filename (without extension):",
        },
      ]);

      const inputPath = path.join(this.videoDir, input);
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Selected file does not exist."));
        return;
      }

      const baseName =
        answers.output || path.basename(input, path.extname(input));

      const outputFolder = path.join(
        defaultVideoConfigs.output,
        baseName,
        answers.resolution
      );
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      const outputPath = path.join(
        outputFolder,
        `${baseName}.${answers.format}`
      );

      console.log(chalk.yellow("🔄 Converting..."));
      await FFmpegUtil.convertVideo(inputPath, outputPath, answers);
      console.log(
        chalk.green(`✅ Conversion complete! Saved at: ${outputPath}`)
      );
    } catch (error) {
      ErrorService.handleError(error, "Failed to convert video.");
    }
  }

  private getVideoFiles(): string[] {
    try {
      return fs
        .readdirSync(this.videoDir)
        .filter((file) => file.match(/\.(mp4|mkv|avi|mov|webm|flv)$/));
    } catch (error) {
      console.log(chalk.red("❌ Failed to read directory."));
      return [];
    }
  }
}
