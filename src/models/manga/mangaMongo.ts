import {
  mangaAuthorCollection,
  mangaDetailChapterCollection,
  mangaDetailChapterImageCollection,
  mangaDetailCollection,
  mangaTagCollection,
  mangaThumnailCollection,
} from "models/mongo";
import Puppeteer from "models/puppeteer";
import { ObjectId } from "mongodb";
import {
  MangaAuthorClient,
  MangaAuthorMongo,
  MangaAuthorPuppeteer,
  MangaChapterClient,
  MangaDetailChapterClient,
  MangaDetailChapterPuppeteer,
  MangaDetailClient,
  MangaDetailPuppeteer,
  MangaLink,
  MangaListClient,
  MangaOrder,
  MangaSort,
  MangaTagClient,
  MangaTagMongo,
  MangaTagPuppeteer,
  MangaThumnailClient,
  MangaType,
} from "types/manga";
import { momentNowTS } from "utils/date";
import MangaFirebase from "./mangaFirebase";
import MangaService from "./mangaService";

const limit = 20;

export default abstract class MangaMongo {
  static async mangaList(
    type: MangaType,
    page: number = 1,
    sort: MangaSort,
    order: MangaOrder,
    keyword?: string,
    tagId?: string[]
  ) {
    await mangaDetailCollection.createIndex({
      title: "text",
      altTitle: "text",
    });

    const tagHandle = () => {
      const pipeline: any[] = [{ $project: { _id: 1, name: 1 } }];

      if (tagId && tagId.length != 0) {
        const objIds = tagId.map((item) => new ObjectId(item));
        pipeline.unshift({
          $match: { _id: { $in: objIds } },
        });
      }

      return {
        $lookup: {
          from: "mangaTag",
          localField: "tags",
          foreignField: "_id",
          pipeline,
          as: "tags",
        },
      };
    };

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

    const aggregate: any[] = [
      {
        $facet: {
          data: [
            { $match: { type } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { type: 0, href: 0, thumnail: 0, altTitle: 0 } },
            tagHandle(),
            {
              $lookup: {
                from: "mangaAuthor",
                localField: "authors",
                foreignField: "_id",
                pipeline: [{ $project: { _id: 1, name: 1 } }],
                as: "authors",
              },
            },
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
        $addFields: {
          totalPage: { $ceil: { $divide: ["$totalPage", limit] } },
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
    ];

    if (keyword) aggregate.unshift({ $match: { $text: { $search: keyword } } });

    return await mangaDetailCollection
      .aggregate<MangaListClient>(aggregate)
      .next();
  }

  static async getTags(type: MangaType) {
    return await mangaTagCollection
      .find<MangaTagClient>(
        { type },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .sort({ name: 1 })
      .toArray();
  }

  static async getTagList(type: MangaType, tags: string[]) {
    return await mangaTagCollection
      .find<MangaTagClient>(
        { type, name: { $in: tags } },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .toArray();
  }

  static async postTagsCrawl(data: MangaTagPuppeteer[], type: MangaType) {
    const array: Omit<MangaTagMongo, "_id">[] = data.map((item) => ({
      ...item,
      type,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    }));

    const list: string[] = [];
    await mangaTagCollection.insertMany(array).then(({ insertedIds }) => {
      Object.keys(insertedIds).forEach((key) => {
        list.push(insertedIds[parseInt(key)].toString());
      });
    });

    return list;
  }

  static async putTagsCrawl(data: MangaLink[], type: MangaType) {
    // get tags from database
    const tagList = await MangaMongo.getTagList(
      type,
      data.map((item) => item.name)
    );

    const tagDetail: ObjectId[] = [];
    // check equal tag
    if (data.length == tagList.length) {
      // no new tag
      tagList.forEach((item) => {
        tagDetail.push(new ObjectId(item._id));
      });
    } else {
      // get new tags
      const filter = data.filter(({ name }) => {
        const result = tagList.find((item) => item.name == name);
        if (result) return false;
        else return true;
      });

      // add any new tag
      if (filter.length != 0) {
        const manga = MangaService.init(type);
        const list: MangaTagPuppeteer[] = [];
        const length = filter.length;

        for (let index = 0; index < length; index++) {
          const item = filter[index];
          list.push({
            ...item,
            type,
            description: await manga.tagDescription(item.href),
          });
        }

        const listId = await MangaMongo.postTagsCrawl(list, type);

        tagList.forEach((item) => {
          tagDetail.push(new ObjectId(item._id));
        });

        listId.forEach((item) => {
          tagDetail.push(new ObjectId(item));
        });
      } else {
        tagList.forEach((item) => {
          tagDetail.push(new ObjectId(item._id));
        });
      }
    }

    return tagDetail;
  }

  static async getAuthorList(type: MangaType, names: string[]) {
    return await mangaAuthorCollection
      .find<MangaAuthorClient>(
        { type, name: { $in: names } },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .toArray();
  }

  static async postAuthorsCrawl(data: MangaAuthorPuppeteer[], type: MangaType) {
    const array: Omit<MangaAuthorMongo, "_id">[] = data.map((item) => ({
      ...item,
      type,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    }));

    const list: string[] = [];
    await mangaAuthorCollection.insertMany(array).then(({ insertedIds }) => {
      Object.keys(insertedIds).forEach((key) => {
        list.push(insertedIds[parseInt(key)].toString());
      });
    });

    return list;
  }

  static async putAuthorCrawl(
    data: string | MangaLink | MangaLink[] | undefined,
    type: MangaType
  ) {
    const authorDetail: ObjectId[] = [];
    if (typeof data == "string") {
      // no link
      const authorList = await MangaMongo.getAuthorList(type, [""]);

      if (authorList.length == 0) {
        const listId = await MangaMongo.postAuthorsCrawl(
          [{ href: "", name: data, type }],
          type
        );

        listId.forEach((item) => {
          authorDetail.push(new ObjectId(item));
        });
      } else {
        authorList.forEach((item) => {
          authorDetail.push(new ObjectId(item._id));
        });
      }
    } else if (typeof data != "undefined") {
      // array obj
      try {
        const list = data as MangaLink[];
        const authorList = await MangaMongo.getAuthorList(
          type,
          list.map((item) => item.name)
        );

        // check equal author
        if (list.length == authorList.length) {
          // no new author
          authorList.forEach((item) => {
            authorDetail.push(new ObjectId(item._id));
          });
        } else {
          // get new authors
          const filter = list.filter(({ name }) => {
            const result = authorList.find((item) => item.name == name);
            if (result) return false;
            else return true;
          });

          // add any new author
          if (filter.length != 0) {
            const listId = await MangaMongo.postAuthorsCrawl(
              filter.map((item) => ({ ...item, type })),
              type
            );

            authorList.forEach((item) => {
              authorDetail.push(new ObjectId(item._id));
            });

            listId.forEach((item) => {
              authorDetail.push(new ObjectId(item));
            });
          } else {
            authorList.forEach((item) => {
              authorDetail.push(new ObjectId(item._id));
            });
          }
        }
      } catch (error) {
        // obj
        const item = data as MangaLink;
        const authorList = await MangaMongo.getAuthorList(type, [item.name]);

        if (authorList.length == 0) {
          const listId = await MangaMongo.postAuthorsCrawl(
            [{ ...item, type }],
            type
          );

          listId.forEach((item) => {
            authorDetail.push(new ObjectId(item));
          });
        } else {
          authorList.forEach((item) => {
            authorDetail.push(new ObjectId(item._id));
          });
        }
      }
    }

    return authorDetail;
  }

  static async getDetail(id: ObjectId, type: MangaType) {
    return await mangaDetailCollection
      .aggregate<MangaDetailClient>([
        { $match: { _id: id, type } },
        {
          $lookup: {
            from: "mangaTag",
            localField: "tags",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, name: 1, description: 1 } }],
            as: "tags",
          },
        },
        {
          $lookup: {
            from: "mangaAuthor",
            localField: "authors",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, name: 1 } }],
            as: "authors",
          },
        },
        {
          $project: {
            href: 0,
            type: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ])
      .next();
  }

  static async getDetailExist(href: string, type: MangaType) {
    return await mangaDetailCollection.findOne<{
      _id: string;
      thumnail: string;
      status: string;
    }>({ type, href }, { projection: { _id: 1, thumnail: 1, status: 1 } });
  }

  static async postDetailCrawl(data: MangaDetailPuppeteer, type: MangaType) {
    const { authors, tags, chapters, ...detail } = data;

    const tagDetail: ObjectId[] = await MangaMongo.putTagsCrawl(tags, type);
    const authorDetail: ObjectId[] = await MangaMongo.putAuthorCrawl(
      authors,
      type
    );

    // insert detail
    const { insertedId: detailId } = await mangaDetailCollection.insertOne({
      ...detail,
      tags: tagDetail,
      authors: authorDetail,
    });

    // add thumnail
    await MangaMongo.postThumnailCrawl(detailId, type, detail.href);

    // add chapter
    await MangaMongo.postDetailChapterCrawl(detailId, type, chapters);
  }

  static async putDetailCrawl(
    id: ObjectId,
    type: MangaType,
    data: { [key: string]: unknown }
  ) {
    await mangaDetailCollection.updateOne({ _id: id, type }, { $set: data });
  }

  static async deleteDetail(id: ObjectId, type: MangaType) {
    await mangaDetailCollection.deleteOne({ _id: id, type });
    await MangaMongo.deleteThumnail(id, type);
    await MangaMongo.deleteDetailChapterAll(id, type);
  }

  static async getThumnail(id: ObjectId, type: MangaType) {
    return await mangaThumnailCollection.findOne<MangaThumnailClient>(
      { detailId: id, type },
      { projection: { type: 0, createdAt: 0, updatedAt: 0 } }
    );
  }

  static async postThumnailCrawl(id: ObjectId, type: MangaType, href: string) {
    const manga = MangaService.init(type);
    console.log("url", type, manga.baseUrl + href);

    const buffer = await Puppeteer.thumnail(type, manga.baseUrl + href);
    const src = await MangaFirebase.addThumnail(buffer, id.toString(), type);

    await mangaThumnailCollection.insertOne({
      detailId: id,
      type,
      src,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });
  }

  static async deleteThumnail(id: ObjectId, type: MangaType) {
    await MangaFirebase.deleteThumnail(id.toString(), type);

    await mangaThumnailCollection.deleteOne({
      detailId: id,
      type,
    });
  }

  static async getDetailChapter(
    detailId: ObjectId,
    chapterId: ObjectId,
    type: MangaType
  ) {
    return await mangaDetailChapterCollection
      .aggregate<MangaChapterClient>([
        { $match: { detailId, type } },
        {
          $facet: {
            current: [
              { $match: { _id: chapterId } },
              { $project: { _id: 1, chapter: 1 } },
            ],
            chapters: [
              { $project: { _id: 1, chapter: 1 } },
              { $sort: { chapter: -1 } },
            ],
          },
        },
        {
          $project: {
            current: {
              $cond: {
                if: { $eq: [{ $size: "$current" }, 0] },
                then: null,
                else: { $first: "$current" },
              },
            },
            chapters: 1,
          },
        },
        {
          $project: {
            canPrev: {
              $cond: {
                if: { $eq: ["$current", null] },
                then: null,
                else: {
                  $cond: {
                    if: {
                      $lt: [
                        {
                          $add: [
                            {
                              $indexOfArray: ["$chapters._id", "$current._id"],
                            },
                            1,
                          ],
                        },
                        { $size: "$chapters" },
                      ],
                    },
                    then: {
                      $arrayElemAt: [
                        "$chapters",
                        {
                          $add: [
                            {
                              $indexOfArray: ["$chapters._id", "$current._id"],
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    else: null,
                  },
                },
              },
            },
            canNext: {
              $cond: {
                if: { $eq: ["$current", null] },
                then: null,
                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $subtract: [
                            {
                              $indexOfArray: ["$chapters._id", "$current._id"],
                            },
                            1,
                          ],
                        },
                        0,
                      ],
                    },
                    then: {
                      $arrayElemAt: [
                        "$chapters",
                        {
                          $subtract: [
                            {
                              $indexOfArray: ["$chapters._id", "$current._id"],
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    else: null,
                  },
                },
              },
            },
            current: 1,
            chapters: 1,
          },
        },
        {
          $lookup: {
            from: "mangaDetailChapterImage",
            let: { id: "$current._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$chapterId", "$$id"] } } },
              { $sort: { chapterIndex: 1 } },
              {
                $project: { _id: 1, chapterId: 1, chapterIndex: 1, src: 1 },
              },
            ],
            as: "current.chapters",
          },
        },
      ])
      .next();
  }

  static async getDetailChapters(id: ObjectId, type: MangaType) {
    return await mangaDetailChapterCollection
      .find<MangaDetailChapterClient>(
        { detailId: id, type },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .sort({ chapter: -1 })
      .toArray();
  }

  static async getDetailChapterList(id: ObjectId, type: MangaType) {
    return await mangaDetailChapterCollection
      .find<{
        _id: string;
        chapter: number;
      }>({ detailId: id, type }, { projection: { _id: 1, thumnail: 1 } })
      .sort({ chapter: -1 })
      .toArray();
  }

  static async postDetailChapterCrawl(
    id: ObjectId,
    type: MangaType,
    data: MangaDetailChapterPuppeteer[]
  ) {
    const manga = MangaService.init(type);

    // update lastest to detail
    const lastest = [...data].sort((a, b) => b.time - a.time).shift();
    if (lastest) {
      await MangaMongo.putDetailCrawl(id, type, {
        lastestUpdated: lastest.time,
      });
    }

    // loop chapter
    const chapterLength = data.length;
    for (let index = 0; index < chapterLength; index++) {
      const item = data[index];

      const { title, ...rest } = item;
      const chapter = title.match(/\d+(?:\.?\d+)?/g);

      // insert chapter
      const { insertedId: chapterId } =
        await mangaDetailChapterCollection.insertOne({
          ...rest,
          chapter: chapter ? parseFloat(chapter[0]) : -1,
          type,
          detailId: id,
          createdAt: momentNowTS(),
          updatedAt: momentNowTS(),
        });

      // loop insert image
      const buffers = await manga.chapter(item.href);
      const bufferLength = buffers.length;
      for (let index = 0; index < bufferLength; index++) {
        const item = buffers[index];
        const src = await MangaFirebase.addImage(
          item,
          id.toString(),
          chapterId.toString(),
          index,
          type
        );

        await mangaDetailChapterImageCollection.insertOne({
          chapterId,
          chapterIndex: index,
          type,
          src,
          createdAt: momentNowTS(),
          updatedAt: momentNowTS(),
        });
      }
    }
  }

  static async deleteDetailChapterAll(id: ObjectId, type: MangaType) {
    const array = await mangaDetailChapterCollection
      .find({ detailId: id, type }, {})
      .toArray();

    const length = array.length;
    for (let index = 0; index < length; index++) {
      const { _id } = array[index];
      await mangaDetailChapterCollection.deleteOne({ _id });
      await MangaMongo.deleteDetailChapterImageAll(id, _id, type);
    }
  }

  static async deleteDetailChapters(
    detailId: ObjectId,
    chapterIds: string[],
    type: MangaType
  ) {
    const objIds = chapterIds.map((item) => new ObjectId(item));
    const length = objIds.length;
    for (let index = 0; index < length; index++) {
      const item = objIds[index];
      const { value } = await mangaDetailChapterCollection.findOneAndDelete({
        _id: item,
        type,
      });

      if (value?._id) {
        await MangaMongo.deleteDetailChapterImageAll(detailId, value._id, type);
      }
    }
  }

  static async deleteDetailChapterImageAll(
    detailId: ObjectId,
    chapterId: ObjectId,
    type: MangaType
  ) {
    const list = await mangaDetailChapterImageCollection
      .find<{ chapterIndex: number }>(
        { chapterId, type },
        { projection: { chapterIndex: 1 } }
      )
      .toArray();

    const length = list.length;
    for (let index = 0; index < length; index++) {
      const item = list[index];
      await MangaFirebase.deleteImage(
        detailId.toString(),
        chapterId.toString(),
        item.chapterIndex,
        type
      );
    }

    await mangaDetailChapterImageCollection.deleteMany({ chapterId, type });
  }
}
