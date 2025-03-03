import chalk from "chalk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import ora from "ora"; // Import ora for spinner
import path from "path";

export class FFmpegUtil {
  static async convertVideo(
    inputPath: string,
    outputPath: string,
    options: any
  ) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Input video file does not exist."));
        return reject(new Error("Input video file does not exist."));
      }

      console.log(
        chalk.blue(`🔄 Starting conversion: ${path.basename(inputPath)}`)
      );

      const spinner = ora("⏳ Initializing conversion...").start();
      let totalDuration = 0;

      const ffmpegCommand = ffmpeg(inputPath)
        .on("codecData", (data) => {
          totalDuration = parseFloat(data.duration); // Total video duration in seconds
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            spinner.text = `⏳ ${progress.percent.toFixed(2)}% completed...`;
          }
        })
        .on("end", () => {
          spinner.succeed(chalk.green(`Conversion finished: ${outputPath}`));
          resolve(outputPath);
        })
        .on("error", (err) => {
          spinner.fail(chalk.red("❌ FFmpeg Error: " + err.message));
          reject(err);
        });

      // If format is HLS (m3u8)
      if (options.format === "m3u8") {
        outputPath = path.join(path.dirname(outputPath), "output.m3u8");
        ffmpegCommand.outputOptions([
          "-c:v libx264",
          "-preset fast",
          "-crf 22",
          "-sc_threshold 0",
          "-g 48",
          "-keyint_min 48",
          "-hls_time 4",
          "-hls_list_size 0",
          "-f hls",
        ]);
      } else {
        ffmpegCommand
          .outputOptions([
            `-b:v ${options.bitrate || "1000k"}`,
            `-s ${this.getResolution(options.resolution)}`,
          ])
          .toFormat(options.format);
      }

      ffmpegCommand.save(outputPath);
    });
  }

  private static getResolution(resolution: string): string {
    const resolutions: { [key: string]: string } = {
      "480p": "640x480",
      "720p": "1280x720",
      "1080p": "1920x1080",
    };
    return resolutions[resolution] || "1280x720";
  }
}
