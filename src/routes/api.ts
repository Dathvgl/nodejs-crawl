import { Router } from "express";
import mangaRouter from "./manga/mangaRoute";
import musicRouter from "./music/musicRoute";
import roleRouter from "./role/roleRouter";
import userRouter from "./user/userRoute";

const router = Router();

router.use("/role", roleRouter);
router.use("/user", userRouter);
router.use("/manga", mangaRouter);
router.use("/music", musicRouter);

export default router;
