import { Request, Response } from "express";
import { CustomError } from "models/errror";
import { ZingMp3 } from "zingmp3-api-full";

export class ZingMP3Controller {
  async song(req: Request, res: Response) {
    const { id } = req.params;

    const data = await ZingMp3.getSong(id).catch(() => {
      throw new CustomError("Error zing mp3 song", 500);
    });

    res.status(200).json(data);
  }

  async detailPlaylist(req: Request, res: Response) {
    const { id } = req.params;

    const data = await ZingMp3.getDetailPlaylist(id).catch(() => {
      throw new CustomError("Error zing mp3 detail playlist", 500);
    });

    res.status(200).json(data);
  }

  async home(req: Request, res: Response) {
    const data = await ZingMp3.getHome().catch(() => {
      throw new CustomError("Error zing mp3 home", 500);
    });

    res.status(200).json(data);
  }

  async top100(req: Request, res: Response) {
    const data = await ZingMp3.getTop100().catch(() => {
      throw new CustomError("Error zing mp3 top 100", 500);
    });

    res.status(200).json(data);
  }

  async chartHome(req: Request, res: Response) {
    const data = await ZingMp3.getChartHome().catch(() => {
      throw new CustomError("Error zing mp3 chart home", 500);
    });

    res.status(200).json(data);
  }

  async newRelease(req: Request, res: Response) {
    const data = await ZingMp3.getNewReleaseChart().catch(() => {
      throw new CustomError("Error zing mp3 new release", 500);
    });

    res.status(200).json(data);
  }

  async infoSong(req: Request, res: Response) {
    const { id } = req.params;
    const data = await ZingMp3.getInfoSong(id).catch(() => {
      throw new CustomError("Error zing mp3 info song", 500);
    });

    res.status(200).json(data);
  }

  async artist(req: Request, res: Response) {
    const { name } = req.params;

    const data = await ZingMp3.getArtist(name).catch(() => {
      throw new CustomError("Error zing mp3 artist", 500);
    });

    res.status(200).json(data);
  }

  async listArtistSong(req: Request, res: Response) {
    const { id } = req.params;
    const query = req.query as { page?: string; count?: string };

    const page = query.page ?? "1";
    const count = query.count ?? "15";

    const data = await ZingMp3.getListArtistSong(id, page, count).catch(() => {
      throw new CustomError("Error zing mp3 list artist song", 500);
    });

    res.status(200).json(data);
  }

  async lyris(req: Request, res: Response) {
    const { id } = req.params;

    const data = await ZingMp3.getLyric(id).catch(() => {
      throw new CustomError("Error zing mp3 lyric", 500);
    });

    res.status(200).json(data);
  }

  async search(req: Request, res: Response) {
    const { name } = req.params;
    const data = await ZingMp3.search(name).catch(() => {
      throw new CustomError("Error zing mp3 search", 500);
    });

    res.status(200).json(data);
  }

  async listMv(req: Request, res: Response) {
    const { id } = req.params;
    const query = req.query as { page?: string; count?: string };

    const page = query.page ?? "1";
    const count = query.count ?? "15";

    const data = await ZingMp3.getListMV(id, page, count).catch(() => {
      throw new CustomError("Error zing mp3 list mv", 500);
    });

    res.status(200).json(data);
  }

  async categoryMv(req: Request, res: Response) {
    const { id } = req.params;

    const data = await ZingMp3.getCategoryMV(id).catch(() => {
      throw new CustomError("Error zing mp3 category mv", 500);
    });

    res.status(200).json(data);
  }

  async video(req: Request, res: Response) {
    const { id } = req.params;

    const data = await ZingMp3.getVideo(id).catch(() => {
      throw new CustomError("Error zing mp3 video", 500);
    });

    res.status(200).json(data);
  }
}
