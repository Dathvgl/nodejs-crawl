import { Router } from "express";
import { authFirebaseHandler } from "middlewares/authHandler";
import tryCatch from "utils/tryCatch";
import MessageController from "./messageController";

const messageRouter = Router();
const messageController = new MessageController();

messageRouter
  .route("/room")
  .post(authFirebaseHandler, tryCatch(messageController.postMessageRoom));

export default messageRouter;
