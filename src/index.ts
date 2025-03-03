#!/usr/bin/env bun
import chalk from "chalk";
import inquirer from "inquirer";
import { ErrorService } from "./services/error.service";
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
        choices: ["Convert a video", "Merge multiple videos"],
      },
    ]);

    if (task === "Convert a video") {
      const converter = new VideoConverter();
      await converter.run();
    } else {
      const merger = new VideoMerger();
      await merger.run();
    }
  } catch (error) {
    ErrorService.handleError(
      error,
      "An error occurred while executing the CLI."
    );
  }
}

main();
