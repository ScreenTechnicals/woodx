import { Elysia } from "elysia";
import fs from "fs";
import path from "path";
import { $ } from "zx";

export class StreamingService {
  private videoDir: string;
  private app: Elysia;
  private port: number;

  constructor(videoDir: string, port = 3000) {
    this.videoDir = videoDir;
    this.app = new Elysia();
    this.port = port;
  }

  public setupRoutes() {
    // Home route - List available videos & segments
    this.app.get("/", () => {
      try {
        const files = fs.readdirSync(this.videoDir);
        const m3u8Files = files.filter((file) => file.endsWith(".m3u8"));
        const tsFiles = files.filter((file) => file.endsWith(".ts"));

        return {
          message: "Available video streams",
          m3u8_files: m3u8Files.map((file) => ({
            filename: file,
            url: `/videos/${file}`,
          })),
          ts_segments: tsFiles.map((file) => ({
            filename: file,
            url: `/segments/${file}`,
          })),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        return { error: "Failed to list files", details: errorMessage };
      }
    });

    // Stream M3U8 playlist
    this.app.get("/videos/:filename", ({ params }) => {
      const filePath = path.join(this.videoDir, params.filename);

      if (!fs.existsSync(filePath)) {
        return new Response("File not found", { status: 404 });
      }

      return new Response(fs.readFileSync(filePath), {
        headers: { "Content-Type": "application/vnd.apple.mpegurl" },
      });
    });

    // Stream TS segments
    this.app.get("/segments/:filename", ({ params }) => {
      const filePath = path.join(this.videoDir, params.filename);

      if (!fs.existsSync(filePath)) {
        return new Response("Segment not found", { status: 404 });
      }

      return new Response(fs.readFileSync(filePath), {
        headers: { "Content-Type": "video/MP2T" },
      });
    });

    return this.app;
  }

  public async startServer() {
    this.app.listen(this.port, async () => {
      const url = `http://localhost:${this.port}`;
      console.log(`🚀 Server is running at ${url}`);

      try {
        await $`open ${url} || xdg-open ${url} || start ${url}`;
        console.log("🌍 Opened in browser successfully!");
      } catch (err) {
        console.error("❌ Failed to open browser:", (err as Error).message);
      }
    });
  }
}
