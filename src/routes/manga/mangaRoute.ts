import { Router } from "express";
import tryCatch from "utils/tryCatch";
import MangaController from "./mangaController";

const mangaRouter = Router();
const mangaController = new MangaController();

mangaRouter.get("/tagCrawl", tryCatch(mangaController.tagCrawl));
mangaRouter.get("/tag", tryCatch(mangaController.tag));
mangaRouter.get(
  "/chapterOctoparse",
  tryCatch(mangaController.chapterOctoparse)
);
mangaRouter.get("/chapter/:id", tryCatch(mangaController.chapter));
mangaRouter.get(
  "/chapter/:detailId/:chapterId",
  tryCatch(mangaController.chapterImage)
);
mangaRouter.get("/thumnail/:id", tryCatch(mangaController.thumnail));
mangaRouter.get("/detailCrawl", tryCatch(mangaController.detailCrawl));
mangaRouter.get("/getDetailAllId", tryCatch(mangaController.getDetailAllId));
mangaRouter.get(
  "/getDetailChapterAllId",
  tryCatch(mangaController.getDetailChapterAllId)
);
mangaRouter
  .route("/detail/:id")
  .get(tryCatch(mangaController.getDetail))
  .delete(tryCatch(mangaController.deleteDetail));
mangaRouter.get(
  "/lastestOctoparse",
  tryCatch(mangaController.lastestOctoparse)
);
mangaRouter.get("/lastestCrawl", tryCatch(mangaController.lastestCrawl));
mangaRouter.get("/list", tryCatch(mangaController.list));

export default mangaRouter;
