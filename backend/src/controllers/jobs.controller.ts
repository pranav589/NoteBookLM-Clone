import { Request, Response, NextFunction } from "express";
import { queryQueue, indexingQueue } from "../lib/queue";

export class JobsController {
  public static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      let job = await queryQueue.getJob(id);
      let queueType = "query";

      if (!job) {
        job = await indexingQueue.getJob(id);
        queueType = "indexing";
      }

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const state = await job.getState();

      if (state === "completed") {
        return res.json({
          jobId: job.id,
          queue: queueType,
          status: state,
          result: job.returnvalue,
        });
      }

      if (state === "failed") {
        return res.json({
          jobId: job.id,
          queue: queueType,
          status: state,
          error: job.failedReason,
        });
      }

      return res.json({
        jobId: job.id,
        queue: queueType,
        status: state,
      });
    } catch (err) {
      return next(err);
    }
  }
}
