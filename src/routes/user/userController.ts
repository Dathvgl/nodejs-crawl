import { Response } from "express";
import { CustomError } from "models/errror";
import UserMongo from "models/userMongo";
import { RequestAuthHandler } from "types/base";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { mangaTypes } from "types/variable";

const userExist = (str?: string) => {
  if (str) return str;
  else new CustomError("Invalid user", 500);
  return "";
};

const mangaTypeExist = (type?: string) => {
  if (!type || !mangaTypes.includes(type as MangaType)) {
    throw new CustomError("Invalid manga type", 500);
  } else return type as MangaType;
};

export default class UserController {
  async followMangaList(req: RequestAuthHandler, res: Response) {
    const { type, page, sort, order } = req.query as {
      type?: MangaType;
      page?: number;
      sort?: MangaSort;
      order?: MangaOrder;
    };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    if (!sort) throw new CustomError("Invalid sort manga", 500);
    if (!order) throw new CustomError("Invalid order manga", 500);

    const userMongo = new UserMongo();
    const data = await userMongo.followMangaList(
      uid,
      mangaType,
      page,
      sort,
      order
    );

    res.json(data);
  }

  async getFollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const userMongo = new UserMongo();

    const data = await userMongo.getFollowManga(uid, id, mangaType);
    res.json(data);
  }

  async postFollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const userMongo = new UserMongo();

    await userMongo.postFollowManga(uid, id, mangaType);
    res.send("User follow manga");
  }

  async deletefollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const userMongo = new UserMongo();

    await userMongo.deleteFollowManga(id, uid, mangaType);
    res.send("User unfollow manga");
  }
}
