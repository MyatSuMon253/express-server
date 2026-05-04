import { Worker } from "bullmq";
import { Redis } from "ioredis";
import sharp from "sharp";
import path from "path";

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// create worker to process image optimization job
const imageWorker = new Worker(
  "imageQueue",
  async (job) => {
    const { filePath, fileName, width, height, quality } = job.data;
    const optimizedImagePath = path.join(
      __dirname,
      "../../..",
      "/uploads/optimized",
      fileName,
    );
    await sharp(filePath)
      .resize(width, height)
      .webp({ quality })
      .toFile(optimizedImagePath);
  },
  { connection },
);

imageWorker.on("completed", (job) => {
  console.log(`job completed with result ${job.id}`);
});

imageWorker.on("failed", (job: any, error) => {
  console.log(`job ${job.id} failed with ${error.message} `);
});
