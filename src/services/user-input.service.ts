import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { tasks } from "../common/constants/tasks.constant";
import type { AWSConfig } from "../common/types/aws.type";
import { defaultVideoConfig } from "../configs/default-video.config";


export class UserInputService {
  // private static instance: UserInputService;

  public async askForTask(): Promise<string> {
    const { task } = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: "📌 What do you want to do?",
        choices: tasks,
      },
    ]);

    return task;
  }

  private validateDirectory(input: string): true | string {
    try {
      const dir = path.resolve(input.trim());
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return "❌ Invalid directory! Please enter a valid path.";
      }
      return true;
    } catch {
      return "❌ Error accessing the directory. Check permissions.";
    }
  }
  private validateFilename(input: string): true | string {
    const trimmed = input.trim();
    if (!trimmed) return "❌ Filename cannot be empty!";
    if (/[<>:"/\\|?*]/.test(trimmed))
      return "❌ Invalid characters in filename!";
    return true;
  }

  public async askForVideoDir(): Promise<string> {
    const { videoDirectory } = await inquirer.prompt([
      {
        type: "input",
        name: "videoDirectory",
        message: "📁 Enter the directory where videos are stored:",
        default: process.cwd(),
        validate: this.validateDirectory,
      },
    ]);

    return path.resolve(videoDirectory.trim());
  }

  public async askForVideoSelection(videoFiles: string[]): Promise<string> {
    const { selectedVideo } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedVideo",
        message: "Select a video file to convert:",
        choices: videoFiles,
      },
    ]);

    return selectedVideo;
  }

  public async askForMulipleResolutions(): Promise<string[]> {
    const availableResolutions = defaultVideoConfig.videoResolutions;
    const { selectedResolutions } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedResolutions",
        message: "Select resolutions for conversion:",
        choices: availableResolutions,
      },
    ]);

    return selectedResolutions;
  }

  public async askForResolution(): Promise<string> {
    const { resolution } = await inquirer.prompt([
      {
        type: "list",
        name: "resolution",
        message: "🖥️ Select resolution:",
        choices: defaultVideoConfig.videoResolutions,
        default: defaultVideoConfig.resolution,
      },
    ]);

    return resolution;
  }

  public async askForFormat(): Promise<string> {
    const { format } = await inquirer.prompt([
      {
        type: "list",
        name: "format",
        message: "📀 Choose format:",
        choices: defaultVideoConfig.videoFormats,
        default: defaultVideoConfig.format,
      },
    ]);

    return format;
  }

  public async askForOutputFilename(defaultVideoName: string): Promise<string> {
    const { output } = await inquirer.prompt([
      {
        type: "input",
        name: "output",
        message: "💾 Output filename (without extension):",
        default: defaultVideoName,
        validate: this.validateFilename,
      },
    ]);

    return output.trim();
  }

  public async askForOutputDirectory(selectedVideo: string): Promise<string> {
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
        validate: this.validateFilename,
      },
    ]);

    return folderName.trim();
  }

  public async askForVideosToMerge(videoFiles: string[]): Promise<string[]> {
    if (videoFiles.length < 2) {
      throw new Error("❌ At least 2 videos are required to merge!");
    }

    const { selectedVideos } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedVideos",
        message: "📽️ Select videos to merge:",
        choices: videoFiles,
        validate: (input) =>
          input.length < 2 ? "❌ Select at least 2 videos!" : true,
      },
    ]);

    return selectedVideos;
  }

  public async askForM3U8Directory(): Promise<string> {
    const { directory } = await inquirer.prompt([
      {
        type: "input",
        name: "directory",
        message: "📂 Enter the directory containing your M3U8 files:",
        default: path.resolve(process.cwd(), defaultVideoConfig.output),
        validate: this.validateDirectory,
      },
    ]);

    return path.resolve(directory.trim());
  }

  public async askForStreamingPort(): Promise<number> {
    const { port } = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: "🌍 Enter the port to host the stream on:",
        default: defaultVideoConfig.port.toString(),
        validate: (input) => {
          const portNumber = parseInt(input, 10);
          return isNaN(portNumber) || portNumber <= 0
            ? "❌ Please enter a valid port number."
            : true;
        },
      },
    ]);

    return parseInt(port, 10);
  }

  public async askBitrate(resolution: string): Promise<string> {
    const bitrateDefault =
      defaultVideoConfig.videoBitrates[
      resolution as keyof typeof defaultVideoConfig.videoBitrates
      ] || "3500k"; // Fallback default

    const { bitrate } = await inquirer.prompt([
      {
        type: "input",
        name: "bitrate",
        message: `Set bitrate for ${resolution} (default: ${bitrateDefault}):`,
        default: bitrateDefault,
      },
    ]);

    return bitrate;
  }

  public async askForMissingS3Configs(): Promise<AWSConfig> {
    const answers = await inquirer.prompt<AWSConfig>([
      {
        type: 'input',
        name: 'accessKeyId' as const,
        message: 'Enter your AWS Access Key ID:',
        required: true
      },
      {
        type: 'password',
        name: 'secretAccessKey' as const,
        message: 'Enter your AWS Secret Access Key:',
        validate: (password) => !!password.length
      },
      {
        type: 'list',
        name: 'region' as const,
        message: 'Select AWS Region:',
        choices: ['us-east-1', 'us-west-2', 'eu-central-1'],
        default: "us-east-1"
      },
      {
        type: 'input',
        name: 'bucketName' as const,
        message: 'Enter Bucket Name:',
        required: true
      },
    ]);

    return answers
  }

  public async askForServiceSpace() {
    const { serviceSpace } = await inquirer.prompt([
      {
        type: "list",
        name: "serviceSpace",
        message: "🖥️ Select output space:",
        choices: ['local', 'aws s3 bucket'],
        default: 'local',
      },
    ]);

    return serviceSpace;
  }
}
