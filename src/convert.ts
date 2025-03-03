import chalk from "chalk";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import ora from "ora";
import path from "path";

export async function convertVideo(input: string, options: any) {
  const spinner = ora(`Processing ${input}...`).start();
  const resolutionMap: Record<string, string> = {
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
  };

  try {
    // Ensure output folder exists
    if (!fs.existsSync(path.dirname(options.outputPath))) {
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(input)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(resolutionMap[options.resolution] || "1280x720")
        .videoBitrate(options.bitrate)
        .on("progress", (progress) => {
          spinner.text = `⏳ ${progress.percent?.toFixed(2)}% completed...`;
        })
        .on("end", () => {
          spinner.succeed(
            chalk.green(
              `✅ Conversion completed! Saved to ${options.outputPath}`
            )
          );
          resolve();
        })
        .on("error", (err) => {
          spinner.fail(chalk.red(`❌ Error: ${err.message}`));
          reject(err);
        });

      if (options.format === "hls") {
        // Store HLS chunks inside the output folder
        command = command.outputOptions([
          "-hls_time 10",
          "-hls_list_size 0",
          `-hls_segment_filename ${path.join(
            path.dirname(options.outputPath),
            "chunk_%03d.ts"
          )}`,
        ]);
      }

      command.save(options.outputPath);
    });
  } catch (error) {
    console.error(chalk.red("Failed to convert video."), error);
  }
}
