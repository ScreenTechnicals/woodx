# Woodx

Woodx is a CLI tool for converting videos to HLS (HTTP Live Streaming) format, generating `.m3u8` playlists. It supports serving the converted videos using Caddy for streaming and allows customization of bitrates and resolutions.

## Installation

To install dependencies, run:

```bash
bun install
```

Woodx was created using `bun init` with Bun v1.2.2. Ensure you have [Bun](https://bun.sh), a fast all-in-one JavaScript runtime, installed.

## Usage

### Development
To run the tool in development mode:

```bash
bun dev
```

### Build
To build the tool for different platforms:

```bash
bun run build
```

This executes the following platform-specific builds:
- Linux: `bun run build-linux`
- Windows: `bun run build-windows`
- macOS (Intel): `bun run build-macos-intel`
- macOS (ARM): `bun run build-macos-arm`

To create a universal macOS binary:
```bash
bun run build-macos-universal
```

The compiled binaries are output to the `./dist` directory.

### Serving
To serve HLS content using Caddy:

```bash
bun run caddy
```

To start or restart Caddy via Homebrew:
```bash
bun run start-caddy
bun run restart-caddy
```

To expose the local server (running on `http://localhost:2019`) using ngrok:
```bash
bun run serve
```

### Features
- Convert videos to HLS (`.m3u8`) format.
- Serve HLS streams using Caddy.
- Customize video bitrates and resolutions.

## Requirements
- [Bun](https://bun.sh) v1.2.2 or higher.
- [Caddy](https://caddyserver.com/) for streaming (optional, for serving HLS content).
- [Homebrew](https://brew.sh/) for Caddy management on macOS (optional).
- [ngrok](https://ngrok.com/) for exposing the local server (optional).

## Example
To convert a video with custom bitrate and resolution:
```bash
bun dev --input video.mp4 --bitrate 2000k --resolution 1280x720
```

For more details on available options, run:
```bash
bun dev --help
```

## License
This project is licensed under the MIT License.
