import chalk from "chalk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import ora from "ora";
import path from "path";

export class FFmpegService {
  public async convertToHLS(
    inputPath: string,
    outputDir: string,
    selectedResolutions: string[],
    bitrates: Record<string, string>
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Input video file does not exist."));
        return reject(new Error("Input video file does not exist."));
      }
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(
        chalk.blue(`🔄 Converting ${path.basename(inputPath)} to HLS...`)
      );

      try {
        // Process each resolution sequentially
        for (const resolution of selectedResolutions) {
          const outputVariantPath = path.join(outputDir, `${resolution}.m3u8`);
          await new Promise((res, rej) => {
            const spinner = ora(`⏳ Converting ${resolution}...`).start();
            ffmpeg(inputPath)
              .outputOptions([
                "-c:v libx264",
                "-preset fast",
                "-crf 22",
                "-sc_threshold 0",
                "-g 48",
                "-keyint_min 48",
                "-hls_time 4",
                "-hls_list_size 0",
                "-f hls",
                `-s ${this.getResolution(resolution)}`,
                `-b:v ${bitrates[resolution]}`,
              ])
              .on("progress", (progress) => {
                if (progress.percent) {
                  spinner.text = `⏳ ${resolution}: ${progress.percent.toFixed(
                    2
                  )}% completed...`;
                }
              })
              .on("end", () => {
                spinner.succeed(
                  chalk.green(
                    `✅ ${resolution} conversion finished: ${outputVariantPath}`
                  )
                );
                res(null);
              })
              .on("error", (err) => {
                spinner.fail(
                  chalk.red(`❌ FFmpeg Error on ${resolution}: ${err.message}`)
                );
                rej(err);
              })
              .save(outputVariantPath);
          });
        }

        // Create master.m3u8 playlist after all resolutions are processed
        let masterPlaylist = "#EXTM3U\n";
        for (const resolution of selectedResolutions) {
          const actualResolution = this.getResolution(resolution);
          const bitrateStr = bitrates[resolution];
          const bandwidth = this.parseBitrate(bitrateStr);
          masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${actualResolution}\n${resolution}.m3u8\n`;
        }
        const masterPath = path.join(outputDir, "master.m3u8");
        fs.writeFileSync(masterPath, masterPlaylist);
        console.log(chalk.green(`✅ Master playlist created: ${masterPath}`));
        resolve(masterPath);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async convertVideo(
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
          totalDuration = parseFloat(data.duration);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            spinner.text = `⏳ ${progress.percent.toFixed(2)}% completed...`;
          }
        })
        .on("end", () => {
          spinner.succeed(chalk.green(`✅ Conversion finished: ${outputPath}`));
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

  public async mergeVideos(videoPaths: string[], outputPath: string) {
    return new Promise((resolve, reject) => {
      if (videoPaths.length < 2) {
        console.log(
          chalk.red("❌ At least 2 video files are required to merge.")
        );
        return reject(new Error("At least 2 video files are required."));
      }

      console.log(chalk.blue("🔄 Merging videos..."));

      const spinner = ora("⏳ Initializing merge...").start();

      const tempFile = path.join(path.dirname(outputPath), "input.txt");

      try {
        const fileContent = videoPaths
          .map((file) => `file '${path.resolve(file)}'`)
          .join("\n");
        fs.writeFileSync(tempFile, fileContent);
      } catch (error) {
        spinner.fail(chalk.red("❌ Failed to create input file."));
        return reject(error);
      }

      ffmpeg()
        .input(tempFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(outputPath)
        .on("end", () => {
          spinner.succeed(
            chalk.green(`✅ Merge complete! Saved at: ${outputPath}`)
          );
          fs.unlinkSync(tempFile); // Clean up temporary file
          resolve(outputPath);
        })
        .on("error", (err) => {
          spinner.fail(chalk.red("❌ FFmpeg Error: " + err.message));
          reject(err);
        });
    });
  }

  private getResolution(resolution: string): string {
    const resolutions: { [key: string]: string } = {
      "480p": "640x480",
      "720p": "1280x720",
      "1080p": "1920x1080",
    };
    return resolutions[resolution] || "1280x720";
  }

  private parseBitrate(bitrate: string): number {
    // Assumes bitrate format like "800k" or "1.5m"
    const lower = bitrate.toLowerCase();
    if (lower.endsWith("k")) {
      return Math.round(parseFloat(bitrate) * 1000);
    } else if (lower.endsWith("m")) {
      return Math.round(parseFloat(bitrate) * 1000000);
    } else {
      return parseInt(bitrate);
    }
  }
}
