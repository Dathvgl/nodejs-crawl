import { Router } from "express";
import { authFirebaseHandler } from "middlewares/authHandler";
import tryCatch from "utils/tryCatch";
import RoleController from "./roleController";

const roleRouter = Router();
const roleController = new RoleController();

// Role
roleRouter
  .route("/")
  .get(authFirebaseHandler, tryCatch(roleController.getRoles))
  .post(authFirebaseHandler, tryCatch(roleController.postRole));

roleRouter.get("/all", tryCatch(roleController.getRoleAll));

roleRouter
  .route("/:id")
  .put(authFirebaseHandler, tryCatch(roleController.putRole))
  .delete(authFirebaseHandler, tryCatch(roleController.deleteRole));

// Role type
roleRouter
  .route("/type")
  .get(authFirebaseHandler, tryCatch(roleController.getRoleTypes))
  .post(authFirebaseHandler, tryCatch(roleController.postRoleType));

roleRouter.get(
  "/type/all",
  authFirebaseHandler,
  tryCatch(roleController.getRoleTypeAll)
);

roleRouter
  .route("/type/:id")
  .put(authFirebaseHandler, tryCatch(roleController.putRoleType))
  .delete(authFirebaseHandler, tryCatch(roleController.deleteRoleType));

export default roleRouter;
