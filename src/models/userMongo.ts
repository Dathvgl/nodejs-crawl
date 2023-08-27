import { envs } from "index";
import { ObjectId } from "mongodb";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { momentNowTS } from "utils/date";
import { userFollowManga } from "./mongo";

export default class UserMongo {
  async followMangaList(
    uid: string,
    type: MangaType,
    page: number = 1,
    sort: MangaSort,
    order: MangaOrder
  ) {
    const limitList = parseInt(envs.LIMIT_LIST ?? "20");

    const sortHandle = () => {
      const check = order == "asc" ? 1 : -1;
      switch (sort) {
        case "name":
          return [{ $sort: { title: check } }];
        case "chapter":
          return [
            { $addFields: { arrayLength: { $size: "$chapters" } } },
            { $sort: { arrayLength: check } },
            { $unset: "arrayLength" },
          ];
        case "lastest":
        default:
          return [{ $sort: { lastestUpdated: check } }];
      }
    };

    await userFollowManga
      .aggregate([
        { $match: { userId: uid, type } },
        {
          $facet: {
            data: [
              { $match: { userId: uid, type } },
              { $project: { mangaId: 1 } },
            ],
            totalPage: [{ $count: "total" }],
          },
        },
        { $addFields: { currentPage: page } },
        {
          $project: {
            totalData: { $size: "$data" },
            totalPage: {
              $let: {
                vars: { props: { $first: "$totalPage" } },
                in: "$$props.total",
              },
            },
            currentPage: 1,
            canPrev: { $not: { $eq: ["$currentPage", 1] } },
            data: 1,
          },
        },
        {
          $lookup: {
            from: "mangaDetail",
            localField: "$data.mangaId",
            foreignField: "_id",
            pipeline: [
              { $match: { type } },
              { $skip: (page - 1) * limitList },
              { $limit: limitList },
              { $project: { _id: 1, title: 1, lastestUpdated: 1 } },
              {
                $lookup: {
                  from: "mangaDetailChapter",
                  localField: "_id",
                  foreignField: "detailId",
                  pipeline: [
                    { $sort: { chapter: -1 } },
                    { $limit: 3 },
                    { $project: { _id: 1, chapter: 1, time: 1 } },
                  ],
                  as: "chapters",
                },
              },
              ...sortHandle(),
            ],
            as: "data",
          },
        },
        {
          $addFields: {
            totalPage: { $ceil: { $divide: ["$totalPage", limitList] } },
          },
        },
        {
          $addFields: {
            canNext: {
              $and: [
                { $not: { $eq: ["$currentPage", "$totalPage"] } },
                { $not: { $eq: [null, "$totalPage"] } },
              ],
            },
          },
        },
      ])
      .next();
  }

  async getFollowManga(userId: string, mangaId: string, type: MangaType) {
    return await userFollowManga.findOne<{
      _id: string;
      currentChapterId: string;
      lastestChapterId: string;
      createdAt: number;
    }>(
      {
        userId,
        mangaId: new ObjectId(mangaId),
        type,
      },
      {
        projection: {
          _id: 1,
          currentChapterId: 1,
          lastestChapterId: 1,
          createdAt: 1,
        },
      }
    );
  }

  async postFollowManga(
    userId: string,
    mangaId: string,
    type: MangaType,
    chapter: string
  ) {
    await userFollowManga.insertOne({
      userId,
      mangaId: new ObjectId(mangaId),
      type,
      currentChapterId: new ObjectId(chapter == "empty" ? 11 : chapter),
      lastestChapterId: new ObjectId(chapter == "empty" ? 11 : chapter),
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });
  }

  async putFollowManga(
    id: string,
    userId: string,
    type: MangaType,
    replace: boolean,
    currentChapter: string
  ) {
    const updates: any = {
      currentChapterId: new ObjectId(currentChapter),
      updatedAt: momentNowTS(),
    };

    if (replace) updates.lastestChapterId = new ObjectId(currentChapter);

    await userFollowManga.updateOne(
      { _id: new ObjectId(id), userId, type },
      { $set: updates }
    );
  }

  async deleteFollowManga(id: string, userId: string, type: MangaType) {
    await userFollowManga.deleteOne({
      _id: new ObjectId(id),
      userId,
      type,
    });
  }
}
