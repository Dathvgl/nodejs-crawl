import { Request, Response } from "express";
import { CustomError } from "models/errror";
import { auths, stores } from "models/firebase/firebaseService";
import MangaMongo from "models/manga/mangaMongo";
import { aggregateList, fieldLookup, userCollection } from "models/mongo";
import UserMongo from "models/userMongo";
import { ObjectId } from "mongodb";
import { RequestAuthHandler } from "types/base";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { UserMessage, UserType } from "types/user";
import { mangaTypes } from "types/variable";
import { numBase, strEmpty } from "utils/check";
import { momentNowTS } from "utils/date";

const userExist = (str?: string) => {
  if (str) {
    return str;
  } else {
    new CustomError("Invalid user", 500);
    return "";
  }
};

const mangaTypeExist = (type?: string) => {
  if (!type || !mangaTypes.includes(type as MangaType)) {
    throw new CustomError("Invalid manga type", 500);
  } else return type as MangaType;
};

export default class UserController {
  async getUser(req: RequestAuthHandler, res: Response) {
    const uid = userExist(req.uid);

    const aggregate = [
      { $match: { uid } },
      { $project: { createdAt: 0, updatedAt: 0 } },
      ...fieldLookup({
        document: "role",
        field: "roles",
        as: "roles",
        array: true,
        project: { $project: { type: 0, createdAt: 0, updatedAt: 0 } },
      }),
    ];

    const data = await userCollection.aggregate<UserType>(aggregate).next();

    if (!data) {
      const { displayName, email, photoURL } = await auths[0].getUser(uid);

      const obj = {
        uid,
        name: displayName,
        email,
        thumnail: photoURL,
        roles: [],
      };

      const { insertedId } = await userCollection.insertOne({
        ...obj,
        createdAt: momentNowTS(),
        updatedAt: momentNowTS(),
      });

      for (const store of stores) {
        try {
          await store.collection("users").doc(uid).set({
            uid,
            status: true,
            lastOnline: momentNowTS(),
          });

          break;
        } catch (error) {
          console.error(error);
        }
      }

      res.json({ _id: insertedId, ...obj });
    } else {
      res.json(data);
    }
  }

  async getUsers(req: Request, res: Response) {
    const { page, limit, name } = req.query as {
      page?: string;
      limit?: string;
      name?: "asc" | "desc";
    };

    const aggregate = aggregateList({
      listHandle: {
        page: numBase(page, { default: 1 }),
        limit: numBase(limit, { default: 5 }),
      },
      facetBefore: [
        { $sort: { createdAt: -1, name: name == "desc" ? -1 : 1 } },
        { $project: { createdAt: 0, updatedAt: 0 } },
        ...fieldLookup({
          document: "role",
          field: "roles",
          as: "roles",
          array: true,
          project: { $project: { type: 0, createdAt: 0, updatedAt: 0 } },
        }),
      ],
    });

    const data = await userCollection.aggregate(aggregate).next();

    res.json(data);
  }

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

  async postSessionSignIn(req: Request, res: Response) {
    const { idToken = "" } = req.body as { idToken?: string };
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    try {
      const sessionCookie = await auths[0].createSessionCookie(idToken, {
        expiresIn,
      });

      res.cookie("crawl-auth", sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: true,
      });

      res.status(200).json({ message: "Xác thực" });
    } catch (error) {
      res.status(401).json({ message: "Không xác thực" });
    }
  }

  async postSessionSignOut(req: Request, res: Response) {
    const session = req.cookies["crawl-auth"] || "";
    res.clearCookie("crawl-auth");

    try {
      const decodedClaims = await auths[0].verifySessionCookie(session);
      await auths[0].revokeRefreshTokens(decodedClaims.sub);
      res.status(200).json({ message: "Xóa xác thực" });
    } catch (error) {
      res.status(401).json({ message: "Không xóa xác thực" });
    }
  }

  async postFollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type, chapter } = req.body as {
      type?: MangaType;
      chapter?: string;
    };

    const uid = userExist(req.uid);
    const mangaType = mangaTypeExist(type);
    const mangaChapter = strEmpty(chapter);

    const userMongo = new UserMongo();
    const mangaMongo = new MangaMongo();

    await userMongo.postFollowManga(uid, id, mangaType, mangaChapter);
    await mangaMongo.putDetailFollow(new ObjectId(id), mangaType, 1);

    res.json({ message: "Theo dõi thành công" });
  }

  async putUserRoles(req: Request, res: Response) {
    const { id } = req.params;
    const { roles = [] } = req.body as { roles?: string[] };

    await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { roles } }
    );

    res.json({ _id: id, roles });
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
    const mangaCurrentChapter = strEmpty(currentChapter);

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

    res.json({ message: "User follow manga chapter" });
  }

  async deletefollowManga(req: RequestAuthHandler, res: Response) {
    const { id } = req.params;
    const { type } = req.body as { type?: MangaType };

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

  async getMessageUsers(req: Request, res: Response) {
    const { name } = req.query as { name?: string };

    await userCollection.createIndex({ name: "text" });

    const data = await userCollection
      .aggregate<UserMessage>([
        { $match: { $text: { $search: name } } },
        { $project: { _id: 1, uid: 1, name: 1, thumnail: 1 } },
      ])
      .toArray();

    res.json(data);
  }

  async postMessageUsers(req: Request, res: Response) {
    const { uids } = req.body as { uids: string[] };

    const data = await userCollection
      .find<UserMessage>(
        { uid: { $in: uids } },
        {
          projection: {
            _id: 1,
            uid: 1,
            name: 1,
            thumnail: 1,
          },
        }
      )
      .toArray();

    res.json(data);
  }
}
