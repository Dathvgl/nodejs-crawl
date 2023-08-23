import { Router } from "express";
import tryCatch from "utils/tryCatch";
import UserController from "./userController";
import { authFirebaseHandler } from "middlewares/authHandler";

const userRouter = Router();
const userController = new UserController();

userRouter.get(
  "/followMangaList",
  authFirebaseHandler,
  tryCatch(userController.followMangaList)
);
userRouter
  .route("/followManga/:id")
  .get(authFirebaseHandler, tryCatch(userController.getFollowManga))
  .post(authFirebaseHandler, tryCatch(userController.postFollowManga))
  .delete(authFirebaseHandler, tryCatch(userController.deletefollowManga));

export default userRouter;
