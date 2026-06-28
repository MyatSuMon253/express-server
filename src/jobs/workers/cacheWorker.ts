import { Worker } from "bullmq";
import { redis } from "../../config/redisClient";

const cacheWorker = new Worker(
  "cache-invalidation",
  async (job) => {
    const { pattern } = job.data;
    await invalidateCache(pattern);
  },
  {
    connection: redis,
    concurrency: 5, // process 5 jobs concurrently
  },
);

cacheWorker.on("completed", (job) => {
  console.log(`job completed with result ${job.id}`);
});

cacheWorker.on("failed", (job: any, error) => {
  console.log(`job ${job.id} failed with ${error.message} `);
});

const invalidateCache = async (pattern: string) => {
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    const pipeline = redis.pipeline();
    let totalKeys = 0;

    // process keys in batch
    stream.on("data", (keys: string[]) => {
      if (keys.length > 0) {
        keys.forEach((key) => {
          pipeline.del(key);
          totalKeys++;
        });
      }
    });

    // wrap stream events in a promise
    await new Promise<void>((resolve, reject) => {
      stream.on("end", async () => {
        try {
          if (totalKeys > 0) {
            await pipeline.exec();
            console.log(`Invalidated ${totalKeys} keys`);
          }
          resolve();
        } catch (error) {
          console.error(error);
          reject(error);
        }
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error("Cache Invalidation Error:", error);
    throw error;
  }
};
