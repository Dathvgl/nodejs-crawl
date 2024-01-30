import { Router } from "express";
import { authFirebaseHandler } from "middlewares/authHandler";
import multer from "multer";
import tryCatch from "utils/tryCatch";
import MangaController from "./mangaController";

const mangaRouter = Router();
const mangaController = new MangaController();

mangaRouter.get("/tagCrawl", tryCatch(mangaController.tagCrawl));
mangaRouter.get("/tag", tryCatch(mangaController.tag));

// Get list chapter in manga
mangaRouter.get("/chapter/:id", tryCatch(mangaController.chapter));

// Get list image in chapter of manga
mangaRouter
  .route("/chapter/:detailId/:chapterId")
  .get(tryCatch(mangaController.getChapterImage))
  .put(
    authFirebaseHandler,
    multer().array("files"),
    tryCatch(mangaController.putChapterImage)
  );

// Get cover of manga
mangaRouter.get("/thumnail/:id", tryCatch(mangaController.thumnail));

mangaRouter
  .route("/detail/:id")
  .get(tryCatch(mangaController.getDetail))
  .put(
    authFirebaseHandler,
    multer().single("file"),
    tryCatch(mangaController.putDetail)
  )
  .delete(tryCatch(mangaController.deleteDetail));

mangaRouter.get("/detailFollow/:id", tryCatch(mangaController.getDetailFollow));

mangaRouter
  .route("detailChapter")
  .put(tryCatch(mangaController.putDetailChapter))
  .delete(tryCatch(mangaController.deleteDetailChapter));

mangaRouter.get("/list", tryCatch(mangaController.list));

// Crawl
mangaRouter.post(
  "/detailCrawl",
  authFirebaseHandler,
  tryCatch(mangaController.detailCrawl)
);

mangaRouter.post(
  "/lastestCrawl",
  authFirebaseHandler,
  tryCatch(mangaController.lastestCrawl)
);

export default mangaRouter;
