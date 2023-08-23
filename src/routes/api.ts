import { Router } from "express";
import mangaRouter from "./manga/mangaRoute";
import userRouter from "./user/userRoute";

const router = Router();

router.use("/user", userRouter);
router.use("/manga", mangaRouter);

export default router;
