import { Router } from "express";
import tryCatch from "utils/tryCatch";
import UserController from "./userController";
import { authFirebaseHandler } from "middlewares/authHandler";

const userRouter = Router();
const userController = new UserController();

userRouter.get("/", authFirebaseHandler, tryCatch(userController.getUsers));

userRouter.get("/once", authFirebaseHandler, tryCatch(userController.getUser));

userRouter.post("/session-signin", tryCatch(userController.postSessionSignIn));
userRouter.post(
  "/session-signout",
  authFirebaseHandler,
  tryCatch(userController.postSessionSignOut)
);

userRouter.put("/roles/:id", tryCatch(userController.putUserRoles));

userRouter.get(
  "/followMangaList",
  authFirebaseHandler,
  tryCatch(userController.followMangaList)
);

userRouter
  .route("/followManga/:id")
  .get(authFirebaseHandler, tryCatch(userController.getFollowManga))
  .post(authFirebaseHandler, tryCatch(userController.postFollowManga))
  .put(authFirebaseHandler, tryCatch(userController.putFollowManga))
  .delete(authFirebaseHandler, tryCatch(userController.deletefollowManga));

userRouter.get(
  "/firebaseUser/:id",
  authFirebaseHandler,
  tryCatch(userController.firebaseUser)
);

export default userRouter;
