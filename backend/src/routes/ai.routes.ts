import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { TranscribeController } from "../controllers/transcribe.controller";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/index", upload.single("file"), AIController.indexLegacy);
router.post("/query", AIController.query);
router.post("/roadmap", AIController.roadmap);
router.post("/podcast", AIController.podcast);
router.post("/mindmap", AIController.mindmap);
router.post("/transcribe", upload.single("file"), TranscribeController.transcribe);

export default router;
