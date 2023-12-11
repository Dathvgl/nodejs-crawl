import { Router } from "express";
import tryCatch from "utils/tryCatch";
import MangaController from "./mangaController";

const mangaRouter = Router();
const mangaController = new MangaController();

mangaRouter.get("/tagCrawl", tryCatch(mangaController.tagCrawl));
mangaRouter.get("/tag", tryCatch(mangaController.tag));
// Get list chapter in manga
mangaRouter.get("/chapter/:id", tryCatch(mangaController.chapter));
// Get list image in chapter of manga
mangaRouter.get(
  "/chapter/:detailId/:chapterId",
  tryCatch(mangaController.chapterImage)
);
// Get cover of manga
mangaRouter.get("/thumnail/:id", tryCatch(mangaController.thumnail));
mangaRouter.get("/detailCrawl", tryCatch(mangaController.detailCrawl));
mangaRouter
  .route("/detail/:id")
  .get(tryCatch(mangaController.getDetail))
  .delete(tryCatch(mangaController.deleteDetail));
mangaRouter.get("/detailFollow/:id", tryCatch(mangaController.getDetailFollow));
mangaRouter
  .route("detailChapter")
  .put(tryCatch(mangaController.putDetailChapter))
  .delete(tryCatch(mangaController.deleteDetailChapter));
mangaRouter.get("/lastestCrawl", tryCatch(mangaController.lastestCrawl));
mangaRouter.get("/list", tryCatch(mangaController.list));

export default mangaRouter;
