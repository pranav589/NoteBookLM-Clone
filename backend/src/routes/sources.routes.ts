import { Router } from "express";
import { SourcesController } from "../controllers/sources.controller";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Mounted at /api/notebooks in router aggregator
router.get("/:id/sources", SourcesController.list);
router.get("/:id/sources/:sourceId", SourcesController.get);
router.post("/:id/sources", upload.single("file"), SourcesController.create);
router.post("/:id/sources/:sourceId", SourcesController.reindex);
router.delete("/:id/sources/:sourceId", SourcesController.delete);

export default router;
