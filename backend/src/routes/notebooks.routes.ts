import { Router } from "express";
import { NotebooksController } from "../controllers/notebooks.controller";
import { NotificationsController } from "../controllers/notifications.controller";

const router = Router();

router.get("/", NotebooksController.list);
router.post("/", NotebooksController.create);
router.get("/:id", NotebooksController.get);
router.delete("/:id", NotebooksController.delete);
router.get("/:id/messages", NotebooksController.getMessages);
router.get("/:id/sse", NotebooksController.sse);

router.get("/:id/notifications", NotificationsController.list);
router.patch("/:id/notifications/:notificationId", NotificationsController.markAsRead);
router.delete("/:id/notifications/:notificationId", NotificationsController.delete);

export default router;
