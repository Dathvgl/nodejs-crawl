import { Router } from "express";
import tryCatch from "utils/tryCatch";
import MangaController from "./mangaController";

const mangaRouter = Router();

mangaRouter.get("/test", tryCatch(MangaController.test));
mangaRouter.get("/tagCrawl", tryCatch(MangaController.tagCrawl));
mangaRouter.get("/tag", tryCatch(MangaController.tag));
mangaRouter.get(
  "/chapterOctoparse",
  tryCatch(MangaController.chapterOctoparse)
);
mangaRouter.get("/chapter/:id", tryCatch(MangaController.chapter));
mangaRouter.get(
  "/chapter/:detailId/:chapterId",
  tryCatch(MangaController.chapterImage)
);
mangaRouter.get("/thumnail/:id", tryCatch(MangaController.thumnail));
mangaRouter.get("/detailCrawl", tryCatch(MangaController.detailCrawl));
mangaRouter
  .route("/detail/:id")
  .get(tryCatch(MangaController.getDetail))
  .delete(tryCatch(MangaController.deleteDetail));
mangaRouter.get(
  "/lastestOctoparse",
  tryCatch(MangaController.lastestOctoparse)
);
mangaRouter.get("/lastestCrawl", tryCatch(MangaController.lastestCrawl));
mangaRouter.get("/list", tryCatch(MangaController.list));

export default mangaRouter;
