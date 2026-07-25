import { Router } from "express";
import notebookRoutes from "./notebooks.routes";
import sourceRoutes from "./sources.routes";
import jobRoutes from "./jobs.routes";
import aiRoutes from "./ai.routes";
import authRoutes from "./auth.routes";
import mediaRoutes from "./media.routes";
import { authMiddleware, checkNotebookOwnership } from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", authRoutes);
router.use("/media", mediaRoutes); // Public media streaming route!

// Protect all other routes
router.use(authMiddleware as any);
router.use(checkNotebookOwnership as any);

router.use("/notebooks", notebookRoutes);
router.use("/notebooks", sourceRoutes);
router.use("/jobs", jobRoutes);
router.use("/", aiRoutes);

export default router;
