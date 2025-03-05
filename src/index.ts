#!/usr/bin/env bun
import chalk from "chalk";
import inquirer from "inquirer";
import path from "path";
import { defaultVideoConfigs } from "./common/constants.common";
import { AdaptiveHLSVideoConverter } from "./services/adaptive-hls-converter.service";
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
          "Adaptive HLS Conversion",
        ],
      },
    ]);

    switch (task) {
      case "Convert a video": {
        const converter = new VideoConverter();
        await converter.run();
        break;
      }

      case "Merge multiple videos": {
        const merger = new VideoMerger();
        await merger.run();
        break;
      }

      case "Host M3U8 stream": {
        const { directory, port } = await inquirer.prompt([
          {
            type: "input",
            name: "directory",
            message: "📂 Enter the directory containing your M3U8 files:",
            default: path.resolve(process.cwd(), defaultVideoConfigs.output),
          },
          {
            type: "input",
            name: "port",
            message: "🌍 Enter the port to host the stream on:",
            default: defaultVideoConfigs.port.toString(),
            validate: (input) => {
              const portNumber = parseInt(input, 10);
              return isNaN(portNumber) || portNumber <= 0
                ? "❌ Please enter a valid port number."
                : true;
            },
          },
        ]);

        const VIDEO_DIR = path.resolve(directory);
        const PORT = parseInt(port, 10) || defaultVideoConfigs.port;

        console.log(
          chalk.green(`🚀 Serving videos from: ${VIDEO_DIR} on port ${PORT}`)
        );

        try {
          const streamingService = new StreamingService(VIDEO_DIR, PORT);
          await streamingService.startServer();
        } catch (err) {
          console.error(
            chalk.red("❌ Failed to start streaming service:"),
            err
          );
        }
        break;
      }

      case "Adaptive HLS Conversion": {
        await AdaptiveHLSVideoConverter.convertToHLS();
        break;
      }

      default:
        console.log(chalk.yellow("⚠️ Invalid option selected."));
        break;
    }
  } catch (error) {
    ErrorService.handleError(
      error,
      "An error occurred while executing the CLI."
    );
  }
}

main();
