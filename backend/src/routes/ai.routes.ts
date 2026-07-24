import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/index", upload.single("file"), AIController.indexLegacy);
router.post("/query", AIController.query);
router.post("/roadmap", AIController.roadmap);
router.post("/podcast", AIController.podcast);
router.post("/mindmap", AIController.mindmap);

export default router;
