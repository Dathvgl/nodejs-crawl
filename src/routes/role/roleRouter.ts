import { Router } from "express";
import tryCatch from "utils/tryCatch";
import RoleController from "./roleController";

const roleRouter = Router();
const roleController = new RoleController();

// Role
roleRouter
  .route("/")
  .get(tryCatch(roleController.getRole))
  .post(tryCatch(roleController.postRole));

roleRouter
  .route("/:id")
  .put(tryCatch(roleController.putRole))
  .delete(tryCatch(roleController.deleteRole));

// Role type
roleRouter
  .route("/type")
  .get(tryCatch(roleController.getRoleType))
  .post(tryCatch(roleController.postRoleType));

roleRouter
  .route("/type/:id")
  .put(tryCatch(roleController.putRoleType))
  .delete(tryCatch(roleController.deleteRoleType));

export default roleRouter;
