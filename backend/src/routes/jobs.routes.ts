import { Router } from "express";
import { JobsController } from "../controllers/jobs.controller";

const router = Router();

router.get("/:id", JobsController.get);

export default router;
