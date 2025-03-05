#!/usr/bin/env bun
import chalk from "chalk";
import inquirer from "inquirer";
import path from "path";
import { ErrorService } from "./services/error.service";
import { StreamingService } from "./services/streaming.service";
import { VideoConverter } from "./services/video-converter.service";
import { VideoMerger } from "./services/video-merger.service";

async function main() {
  console.log(chalk.cyan("\n🎥 Welcome to Video CLI!\n"));

  try {
    const { task } = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: "📌 What do you want to do?",
        choices: [
          "Convert a video",
          "Merge multiple videos",
          "Host M3U8 stream",
        ],
      },
    ]);

    if (task === "Convert a video") {
      const converter = new VideoConverter();
      await converter.run();
    } else if (task === "Merge multiple videos") {
      const merger = new VideoMerger();
      await merger.run();
    } else if (task === "Host M3U8 stream") {
      const { directory } = await inquirer.prompt([
        {
          type: "input",
          name: "directory",
          message: "📂 Enter the directory containing your M3U8 files:",
          default: path.join(process.cwd(), "outputs"),
        },
      ]);

      const VIDEO_DIR = path.resolve(directory);
      console.log(chalk.green(`🚀 Serving videos from: ${VIDEO_DIR}`));

      const streamingService = new StreamingService(VIDEO_DIR);
      streamingService.setupRoutes();
      streamingService.startServer();
    }
  } catch (error) {
    ErrorService.handleError(
      error,
      "An error occurred while executing the CLI."
    );
  }
}

main();
