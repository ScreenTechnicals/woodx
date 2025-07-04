export const defaultVideoConfig = {
  port: 9003,
  videoResolutions: [
    "144p",
    "240p",
    "360p",
    "480p",
    "720p",
    "1080p",
    "1440p",
    "2160p",
  ],
  videoBitrates: {
    "144p": "250k",
    "240p": "500k",
    "360p": "1000k",
    "480p": "1500k",
    "720p": "3500k",
    "1080p": "6000k",
    "1440p": "12000k",
    "2160p": "25000k",
  },
  videoFormats: ["mp4", "webm", "avi", "mov", "m3u8"],
  format: "mp4",
  resolution: "720p",
  output: "./outputs",
};
