#!/usr/bin/env bun
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { convertVideo } from "./convert";

const program = new Command();

type VideoOptions = {
  input: string;
  format: string;
  resolution: string;
  bitrate: string;
  output: string;
  outputPath: string;
};

async function askUserInputs(): Promise<VideoOptions> {
  // Ask for the directory where videos are stored
  const { videoDir } = await inquirer.prompt([
    {
      type: "input",
      name: "videoDir",
      message: "📁 Enter the directory where videos are stored:",
      default: process.cwd(),
      validate: (dir) => {
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
          return "❌ Invalid directory!";
        }
        return true;
      },
    },
  ]);

  // Get list of video files in the selected directory
  const videoFiles = fs
    .readdirSync(videoDir)
    .filter((file) => file.match(/\.(mp4|mkv|avi|mov|webm|flv)$/));

  if (videoFiles.length === 0) {
    console.log(chalk.red("❌ No video files found in this directory."));
    process.exit(1);
  }

  // Ask the user to select a video file
  const { input } = await inquirer.prompt([
    {
      type: "list",
      name: "input",
      message: "🎬 Select a video file to convert:",
      choices: videoFiles,
    },
  ]);

  // Ask for format, resolution, bitrate, and output filename
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "format",
      message: "📀 Choose output format:",
      choices: ["mp4", "webm", "hls", "avi", "mov"],
      default: "mp4",
    },
    {
      type: "list",
      name: "resolution",
      message: "🖥️ Select resolution:",
      choices: ["480p", "720p", "1080p"],
      default: "720p",
    },
    {
      type: "list",
      name: "bitrate",
      message: "🎚️ Choose video bitrate:",
      choices: ["800k", "1000k", "1200k", "1500k"],
      default: "1000k",
    },
    {
      type: "input",
      name: "output",
      message:
        "💾 Enter output filename (without extension) (default: same as input):",
    },
  ]);

  // If output name is not provided, use the input file name without extension
  const inputPath = path.join(videoDir, input);
  const inputFilename = path.basename(input, path.extname(input));
  const outputName = answers.output ? answers.output : inputFilename;

  // Create output directory
  const outputFolder = path.join("outputs", outputName);
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  // Define the output path
  const outputPath = path.join(
    outputFolder,
    answers.format === "hls"
      ? "playlist.m3u8"
      : `${outputName}.${answers.format}`
  );

  return { ...answers, input: inputPath, output: outputName, outputPath };
}

program
  .name("video-cli")
  .version("1.0.0")
  .description("Convert videos with FFmpeg interactively")
  .action(async () => {
    const options = await askUserInputs();
    await convertVideo(options.input, options);
  });

program.parse();
