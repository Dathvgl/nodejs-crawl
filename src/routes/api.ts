import { Router } from "express";
import mangaRouter from "./manga/mangaRoute";
import roleRouter from "./role/roleRouter";
import userRouter from "./user/userRoute";

const router = Router();

router.use("/role", roleRouter);
router.use("/user", userRouter);
router.use("/manga", mangaRouter);

export default router;
