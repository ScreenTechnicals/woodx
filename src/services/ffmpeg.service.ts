import chalk from "chalk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import ora from "ora";
import path from "path";
import { PassThrough } from "stream";

export class FFmpegService {
  public async convertToHLS(
    inputPath: string,
    outputDir: string, // Kept for compatibility, ignored if isUseS3 is true
    selectedResolutions: string[],
    bitrates: Record<string, string>,
    isUseS3: boolean = false,
    onFileGenerated?: (fileName: string, data: Buffer) => Promise<void>
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Input video file does not exist."));
        return reject(new Error("Input video file does not exist."));
      }

      console.log(
        chalk.blue(`🔄 Converting ${path.basename(inputPath)} to HLS...`)
      );

      try {
        if (!isUseS3) {
          // Local filesystem mode (existing behavior)
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

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
                    spinner.text = `⏳ ${resolution}: ${progress.percent.toFixed(2)}% completed...`;
                  }
                })
                .on("end", () => {
                  spinner.succeed(
                    chalk.green(`✅ ${resolution} conversion finished: ${outputVariantPath}`)
                  );
                  res(null);
                })
                .on("error", (err) => {
                  spinner.fail(chalk.red(`❌ FFmpeg Error on ${resolution}: ${err.message}`));
                  rej(err);
                })
                .save(outputVariantPath);
            });
          }

          // Create and write master playlist
          let masterPlaylist = "#EXTM3U\n";
          for (const resolution of selectedResolutions) {
            const actualResolution = this.getResolution(resolution);
            const bandwidth = this.parseBitrate(bitrates[resolution]);
            masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${actualResolution}\n${resolution}.m3u8\n`;
          }
          const masterPath = path.join(outputDir, "master.m3u8");
          fs.writeFileSync(masterPath, masterPlaylist);
          console.log(chalk.green(`✅ Master playlist created: ${masterPath}`));
          resolve(masterPath);
        } else {
          // S3 streaming mode
          if (!onFileGenerated) {
            throw new Error("onFileGenerated callback is required when isUseS3 is true");
          }

          const masterPlaylistLines: string[] = ["#EXTM3U"];
          for (const resolution of selectedResolutions) {
            const actualResolution = this.getResolution(resolution);
            const bandwidth = this.parseBitrate(bitrates[resolution]);

            const variantStream = new PassThrough();
            const spinner = ora(`⏳ Converting ${resolution}...`).start();

            await new Promise<void>((res, rej) => {
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
                  `-s ${actualResolution}`,
                  `-b:v ${bitrates[resolution]}`,
                ])
                .output(variantStream)
                .on("progress", (progress) => {
                  if (progress.percent) {
                    spinner.text = `⏳ ${resolution}: ${progress.percent.toFixed(2)}% completed...`;
                  }
                })
                .on("end", () => {
                  spinner.succeed(chalk.green(`✅ ${resolution} conversion finished`));
                  res();
                })
                .on("error", (err) => {
                  spinner.fail(chalk.red(`❌ FFmpeg Error on ${resolution}: ${err.message}`));
                  rej(err);
                })
                .run();
            });

            // Collect variant playlist data
            let variantData = Buffer.from("");
            variantStream.on("data", (chunk) => {
              variantData = Buffer.concat([variantData, chunk]);
            });
            await new Promise((res) => variantStream.on("end", res));

            // Upload variant playlist
            const variantFileName = `${resolution}.m3u8`;
            await onFileGenerated(variantFileName, variantData);

            // Add to master playlist
            masterPlaylistLines.push(
              `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${actualResolution}`,
              variantFileName
            );
          }

          // Upload master playlist
          const masterPlaylist = masterPlaylistLines.join("\n");
          const masterPath = "master.m3u8";
          await onFileGenerated(masterPath, Buffer.from(masterPlaylist));
          console.log(chalk.green(`✅ Master playlist uploaded: ${masterPath}`));
          resolve(masterPath);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  public async convertVideo(inputPath: string, outputPath: string, options: any) {
    // Unchanged from original (omitted for brevity)
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Input video file does not exist."));
        return reject(new Error("Input video file does not exist."));
      }

      console.log(chalk.blue(`🔄 Starting conversion: ${path.basename(inputPath)}`));
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
          .outputOptions([`-b:v ${options.bitrate || "1000k"}`, `-s ${this.getResolution(options.resolution)}`])
          .toFormat(options.format);
      }

      ffmpegCommand.save(outputPath);
    });
  }

  public async mergeVideos(videoPaths: string[], outputPath: string) {
    // Unchanged from original (omitted for brevity)
    return new Promise((resolve, reject) => {
      if (videoPaths.length < 2) {
        console.log(chalk.red("❌ At least 2 video files are required to merge."));
        return reject(new Error("At least 2 video files are required."));
      }

      console.log(chalk.blue("🔄 Merging videos..."));
      const spinner = ora("⏳ Initializing merge...").start();
      const tempFile = path.join(path.dirname(outputPath), "input.txt");

      try {
        const fileContent = videoPaths.map((file) => `file '${path.resolve(file)}'`).join("\n");
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
          spinner.succeed(chalk.green(`✅ Merge complete! Saved at: ${outputPath}`));
          fs.unlinkSync(tempFile);
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