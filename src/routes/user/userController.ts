import { Request, Response } from "express";
import { CustomError } from "models/errror";
import { auths } from "models/firebase/firebaseService";
import MangaMongo from "models/manga/mangaMongo";
import UserMongo from "models/userMongo";
import { ObjectId } from "mongodb";
import { RequestAuthHandler } from "types/base";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { mangaTypes } from "types/variable";
import { strExist } from "utils/check";

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
    const { type, chapter } = req.query as {
      type?: MangaType;
      chapter?: string;
    };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const mangaChapter = strExist(chapter);

    const userMongo = new UserMongo();
    const mangaMongo = new MangaMongo();

    const data = await userMongo.postFollowManga(
      uid,
      id,
      mangaType,
      mangaChapter
    );
    await mangaMongo.putDetailFollow(new ObjectId(id), mangaType, 1);

    res.json(data);
  }

  async putFollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type, replace, currentChapter } = req.body as {
      type?: MangaType;
      replace?: boolean;
      currentChapter?: string;
    };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const mangaCurrentChapter = strExist(currentChapter);

    if (replace == undefined) {
      throw new CustomError("Invalid change follow manga", 500);
    }

    const userMongo = new UserMongo();

    await userMongo.putFollowManga(
      id,
      uid,
      mangaType,
      replace,
      mangaCurrentChapter
    );

    res.send("User follow manga chapter");
  }

  async deletefollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);

    const userMongo = new UserMongo();
    const mangaMongo = new MangaMongo();

    await userMongo.deleteFollowManga(id, uid, mangaType);
    const data = await mangaMongo.putDetailFollow(
      new ObjectId(id),
      mangaType,
      -1
    );

    res.json(data);
  }

  async firebaseUser(req: Request, res: Response) {
    const { id } = req.params;
    const length = auths.length;

    const user: {
      uid?: string;
      email?: string;
      photoURL?: string;
      displayName?: string;
    } = {};

    for (let index = 0; index < length; index++) {
      const auth = auths[index];

      try {
        const record = await auth
          .getUser(id)
          .then(({ email, photoURL, displayName }) => ({
            email,
            photoURL,
            displayName,
          }));

        user.uid = id;
        user.email = record.email;
        user.photoURL = record.photoURL;
        user.displayName = record.displayName;

        break;
      } catch (error) {
        console.error(error);
      }
    }

    res.json(user);
  }
}
