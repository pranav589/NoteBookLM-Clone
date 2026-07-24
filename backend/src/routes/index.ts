import { Router } from "express";
import notebookRoutes from "./notebooks.routes";
import sourceRoutes from "./sources.routes";
import jobRoutes from "./jobs.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/notebooks", notebookRoutes);
router.use("/notebooks", sourceRoutes);
router.use("/jobs", jobRoutes);
router.use("/", aiRoutes);

export default router;
