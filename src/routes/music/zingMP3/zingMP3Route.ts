import { Router } from "express";
import tryCatch from "utils/tryCatch";
import { ZingMP3Controller } from "./zingMP3Controller";

const zingMP3Route = Router();
const zingMP3Controller = new ZingMP3Controller();

zingMP3Route.get("/song/:id", tryCatch(zingMP3Controller.song));
zingMP3Route.get(
  "/detailPlaylist/:id",
  tryCatch(zingMP3Controller.detailPlaylist)
);
zingMP3Route.get("/home", tryCatch(zingMP3Controller.home));
zingMP3Route.get("/top100", tryCatch(zingMP3Controller.top100));
zingMP3Route.get("/chartHome", tryCatch(zingMP3Controller.chartHome));
zingMP3Route.get("/newReleaseChart", tryCatch(zingMP3Controller.newRelease));
zingMP3Route.get("/infoSong/:id", tryCatch(zingMP3Controller.infoSong));
zingMP3Route.get("/artist/:name", tryCatch(zingMP3Controller.artist));
zingMP3Route.get(
  "/listArtistSong/:id",
  tryCatch(zingMP3Controller.listArtistSong)
);
zingMP3Route.get("/lyris/:id", tryCatch(zingMP3Controller.lyris));
zingMP3Route.get("/search/:name", tryCatch(zingMP3Controller.search));
zingMP3Route.get("/listMv/:id", tryCatch(zingMP3Controller.listMv));
zingMP3Route.get("/categoryMv/:id", tryCatch(zingMP3Controller.categoryMv));
zingMP3Route.get("/video/:id", tryCatch(zingMP3Controller.video));

export default zingMP3Route;
