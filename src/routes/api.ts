import { Router } from "express";
import mangaRouter from "./manga/mangaRoute";

const router = Router();

router.use("/manga", mangaRouter);

export default router;
