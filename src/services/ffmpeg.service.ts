import chalk from "chalk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import ora from "ora";
import path from "path";
import type { Resolution } from "../common/types/video.type";
import { defaultVideoConfig } from "../configs/default-video.config";

export class FFmpegService {
  public async convertToHLS(
    inputPath: string,
    outputDir: string,
    selectedResolutions: Resolution[],
    bitrates: Record<string, string>
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(inputPath)) {
        console.log(chalk.red("❌ Input video file does not exist."));
        return reject(new Error("Input video file does not exist."));
      }

      console.log(chalk.blue(`🔄 Converting ${path.basename(inputPath)} to HLS...`));

      try {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const resolution of selectedResolutions) {
          const outputVariantPath = path.join(outputDir, `${resolution}.m3u8`);
          const segmentPattern = path.join(outputDir, `${resolution}_segment_%03d.ts`);
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
                `-hls_segment_filename ${segmentPattern}`, // Explicitly name segments
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
      } catch (error) {
        reject(error);
      }
    });
  }

  private getResolution(resolution: Resolution): string {
    return defaultVideoConfig.videoResolutions[resolution] || "1280x720";
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