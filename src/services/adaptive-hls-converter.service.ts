import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { defaultVideoConfigs } from "../common/constants.common";
import { FFmpegUtil } from "../utils/ffmpeg-cli.util";

export class AdaptiveHLSVideoConverter {
  static async convertToHLS() {
    console.log(chalk.blue("🔄 Starting adaptive HLS conversion..."));

    try {
      const { videoDirectory } = await inquirer.prompt([
        {
          type: "input",
          name: "videoDirectory",
          message: "📂 Enter the directory containing your video files:",
          default: process.cwd(),
        },
      ]);

      const resolvedDir = path.resolve(videoDirectory);
      if (!fs.existsSync(resolvedDir)) {
        console.log(chalk.red("❌ Directory does not exist."));
        return;
      }

      // List video files (e.g., .mp4)
      const files = fs.readdirSync(resolvedDir);
      const videoFiles = files.filter((file) => file.endsWith(".mp4"));

      if (videoFiles.length === 0) {
        console.log(chalk.red("❌ No video files found in the directory."));
        return;
      }

      // Let the user select a video file
      const { selectedVideo } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedVideo",
          message: "Select a video file to convert:",
          choices: videoFiles,
        },
      ]);

      const inputPath = path.join(resolvedDir, selectedVideo);
      const defaultOutputName = path.basename(
        selectedVideo,
        path.extname(selectedVideo)
      );
      const { folderName } = await inquirer.prompt([
        {
          type: "input",
          name: "folderName",
          message: "Enter the output folder name:",
          default: defaultOutputName,
        },
      ]);
      const outputDir = path.join(process.cwd(), "outputs", folderName);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const availableResolutions = defaultVideoConfigs.videoResolutions;
      const defaultBitrates: Record<string, string> =
        defaultVideoConfigs.videoBitrates;
      const { selectedResolutions } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedResolutions",
          message: "Select resolutions for conversion:",
          choices: availableResolutions,
        },
      ]);

      if (selectedResolutions.length === 0) {
        console.log(chalk.red("❌ No resolutions selected. Exiting..."));
        return;
      }

      const bitrates: Record<string, string> = {};
      for (const resolution of selectedResolutions) {
        const { bitrate } = await inquirer.prompt([
          {
            type: "input",
            name: "bitrate",
            message: `Set bitrate for ${resolution} (default: ${defaultBitrates[resolution]}):`,
            default: defaultBitrates[resolution],
          },
        ]);
        bitrates[resolution] = bitrate;
      }

      await FFmpegUtil.convertToHLS(
        inputPath,
        outputDir,
        selectedResolutions,
        bitrates
      );
      console.log(chalk.green("✅ Adaptive HLS conversion complete!"));
    } catch (error) {
      console.error(chalk.red("❌ Error during conversion:"), error);
      throw error;
    }
  }
}
