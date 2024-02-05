import { Router } from "express";
import zingMP3Router from "./zingMP3/zingMP3Route";

const musicRouter = Router();

musicRouter.use("/zingMP3", zingMP3Router);

export default musicRouter;
