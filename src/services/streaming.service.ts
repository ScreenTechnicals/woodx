import { Elysia } from "elysia";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { $ } from "zx";

export class StreamingService {
  private videoBaseDir: string;
  private app: Elysia;
  private port: number;

  constructor(videoBaseDir: string, port = 3000) {
    this.videoBaseDir = videoBaseDir;
    this.app = new Elysia();
    this.port = port;
  }

  public setupRoutes() {
    this.app.get("/", () => {
      try {
        const allVideos: {
          m3u8_files: any[];
          ts_segments: Record<string, any[]>;
        } = {
          m3u8_files: [],
          ts_segments: {},
        };

        const resolutions = fs.readdirSync(this.videoBaseDir);

        resolutions.forEach((resolution) => {
          const resolutionPath = path.join(this.videoBaseDir, resolution);
          if (!fs.lstatSync(resolutionPath).isDirectory()) return;

          const files = fs.readdirSync(resolutionPath);
          const m3u8Files = files.filter((file) => file.endsWith(".m3u8"));
          const tsFiles = files.filter((file) => file.endsWith(".ts"));

          // Collect all .m3u8 files in a flat array
          allVideos.m3u8_files.push(
            ...m3u8Files.map((file) => ({
              filename: file,
              url: `/videos/${resolution}/${file}`,
            }))
          );

          // Group TS files under resolutions
          if (!allVideos.ts_segments[resolution]) {
            allVideos.ts_segments[resolution] = [];
          }

          allVideos.ts_segments[resolution].push(
            ...tsFiles.map((file) => ({
              filename: file,
              url: `/segments/${resolution}/${file}`,
            }))
          );
        });

        return { message: "Available video streams", videos: allVideos };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        return { error: "Failed to list files", details: errorMessage };
      }
    });

    return this.app;
  }

  public async startServer() {
    // Prompt for port using inquirer
    const { port } = await inquirer.prompt([
      {
        type: "input",
        name: "port",
        message: "Enter port number (default: 3000):",
        default: "3000",
      },
    ]);
    this.port = Number(port) || 3000;

    this.app.listen(this.port, async () => {
      const url = `http://localhost:${this.port}`;
      console.log(`🚀 Server is running at ${url}`);

      try {
        if (process.platform === "win32") {
          await $`start ${url}`;
        } else if (process.platform === "darwin") {
          await $`open ${url}`;
        } else {
          await $`xdg-open ${url}`;
        }
        console.log("🌍 Opened in browser successfully!");
      } catch (err) {
        console.error("❌ Failed to open browser:", (err as Error).message);
      }
    });
  }
}
