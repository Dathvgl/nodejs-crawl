import { envs } from "index";
import {
  mangaAuthorCollection,
  mangaDetailChapterCollection,
  mangaDetailChapterImageCollection,
  mangaDetailCollection,
  mangaTagCollection,
  mangaThumnailCollection,
} from "models/mongo";
import { ObjectId } from "mongodb";
import {
  MangaAuthorClient,
  MangaAuthorFetch,
  MangaAuthorMongo,
  MangaChapterClient,
  MangaDetailChapterClient,
  MangaDetailChapterFetch,
  MangaDetailClient,
  MangaDetailFetch,
  MangaLink,
  MangaListClient,
  MangaOrder,
  MangaSort,
  MangaTagClient,
  MangaTagFetch,
  MangaTagMongo,
  MangaThumnailClient,
  MangaType,
} from "types/manga";
import { momentNowTS } from "utils/date";
import MangaFirebase from "./mangaFirebase";
import MangaService from "./mangaService";

export default class MangaMongo {
  async mangaList(
    type: MangaType,
    page: number = 1,
    sort: MangaSort,
    order: MangaOrder,
    limit?: string,
    keyword?: string,
    tagId?: string[]
  ) {
    const limitBase = parseInt(envs.LIMIT_LIST ?? "20");
    const limitList = parseInt(limit ?? limitBase.toString());

    await mangaDetailCollection.createIndex({
      title: "text",
      altTitle: "text",
    });

    const tagHandle = () => {
      if (tagId && tagId.length != 0) {
        const objIds = tagId.map((item) => new ObjectId(item));
        return { $match: { "tags._id": { $in: objIds } } };
      }

      return { $match: { "tags._id": { $not: { $in: [] } } } };
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
            { $skip: (page - 1) * limitList },
            { $limit: limitList },
            { $project: { type: 0, href: 0, thumnail: 0, altTitle: 0 } },
            {
              $lookup: {
                from: "mangaTag",
                localField: "tags",
                foreignField: "_id",
                pipeline: [{ $project: { _id: 1, name: 1 } }],
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
            tagHandle(),
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
    ];

    if (keyword) aggregate.unshift({ $match: { $text: { $search: keyword } } });

    return await mangaDetailCollection
      .aggregate<MangaListClient>(aggregate)
      .next();
  }

  async getTags(type: MangaType) {
    return await mangaTagCollection
      .find<MangaTagClient>(
        { type },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .sort({ name: 1 })
      .toArray();
  }

  async getTagList(type: MangaType, tags: string[]) {
    return await mangaTagCollection
      .find<MangaTagClient>(
        { type, name: { $in: tags } },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .toArray();
  }

  async postTagsCrawl(data: MangaTagFetch[], type: MangaType) {
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

  async putTagsCrawl(data: MangaLink[], type: MangaType) {
    // get tags from database
    const tagList = await this.getTagList(
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
        const list: MangaTagFetch[] = [];
        const length = filter.length;

        for (let index = 0; index < length; index++) {
          const item = filter[index];
          list.push({
            ...item,
            type,
            description: await manga.tagDescription(item.href),
          });
        }

        const listId = await this.postTagsCrawl(list, type);

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

  async getAuthorList(type: MangaType, names: string[]) {
    return await mangaAuthorCollection
      .find<MangaAuthorClient>(
        { type, name: { $in: names } },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .toArray();
  }

  async postAuthorsCrawl(data: MangaAuthorFetch[], type: MangaType) {
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

  async putAuthorCrawl(
    data: string | MangaLink | MangaLink[] | undefined,
    type: MangaType
  ) {
    const authorDetail: ObjectId[] = [];
    if (typeof data == "string") {
      // no link
      const authorList = await this.getAuthorList(type, [""]);

      if (authorList.length == 0) {
        const listId = await this.postAuthorsCrawl(
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
        const authorList = await this.getAuthorList(
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
            const listId = await this.postAuthorsCrawl(
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
        const authorList = await this.getAuthorList(type, [item.name]);

        if (authorList.length == 0) {
          const listId = await this.postAuthorsCrawl([{ ...item, type }], type);

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

  async getDetailAllId(type: MangaType) {
    return await mangaDetailCollection
      .find({ type }, { projection: { _id: 1 } })
      .toArray();
  }

  async getDetailChapterAllId(type: MangaType) {
    const data = await mangaDetailCollection
      .aggregate<{ data: { _id: string; chapters: { _id: string }[] } }>([
        {
          $facet: {
            data: [
              { $match: { type } },
              { $project: { _id: 1 } },
              {
                $lookup: {
                  from: "mangaDetailChapter",
                  localField: "_id",
                  foreignField: "detailId",
                  pipeline: [{ $project: { _id: 1 } }],
                  as: "chapters",
                },
              },
            ],
          },
        },
      ])
      .next();

    return data ? data.data : [];
  }

  async getDetail(id: ObjectId, type: MangaType) {
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

  async getDetailExist(href: string, type: MangaType) {
    return await mangaDetailCollection.findOne<{
      _id: string;
      thumnail: string;
      status: string;
    }>({ type, href }, { projection: { _id: 1, thumnail: 1, status: 1 } });
  }

  async postDetailCrawl(
    data: MangaDetailFetch,
    type: MangaType,
    chapterLimit: number
  ) {
    const { authors, tags, chapters, ...detail } = data;

    const tagDetail: ObjectId[] = await this.putTagsCrawl(tags, type);
    const authorDetail: ObjectId[] = await this.putAuthorCrawl(authors, type);

    // insert detail
    const { insertedId: detailId } = await mangaDetailCollection.insertOne({
      ...detail,
      tags: tagDetail,
      authors: authorDetail,
    });

    // add thumnail
    await this.postThumnailCrawl(detailId, type, detail.href, detail.thumnail);

    // add chapter
    await this.postDetailChapterCrawl(detailId, type, chapters, chapterLimit);
  }

  async putDetailCrawl(
    id: ObjectId,
    type: MangaType,
    data: { [key: string]: unknown }
  ) {
    await mangaDetailCollection.updateOne({ _id: id, type }, { $set: data });
  }

  async deleteDetail(id: ObjectId, type: MangaType) {
    await mangaDetailCollection.deleteOne({ _id: id, type });
    await this.deleteThumnail(id, type);
    await this.deleteDetailChapterAll(id, type);
  }

  async getThumnail(id: ObjectId, type: MangaType) {
    return await mangaThumnailCollection.findOne<MangaThumnailClient>(
      { detailId: id, type },
      { projection: { type: 0, createdAt: 0, updatedAt: 0 } }
    );
  }

  async postThumnailCrawl(
    id: ObjectId,
    type: MangaType,
    href: string,
    thumnail: string
  ) {
    const manga = MangaService.init(type);
    console.log("url", type, manga.baseUrl + href);

    const buffer = await manga.fetchThumnail(manga.baseUrl + href, thumnail);
    const src = await MangaFirebase.addThumnail(buffer, id.toString(), type);

    await mangaThumnailCollection.insertOne({
      detailId: id,
      type,
      src,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });
  }

  async deleteThumnail(id: ObjectId, type: MangaType) {
    await MangaFirebase.deleteThumnail(id.toString(), type);

    await mangaThumnailCollection.deleteOne({
      detailId: id,
      type,
    });
  }

  async getDetailChapter(
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

  async getDetailChapters(id: ObjectId, type: MangaType) {
    return await mangaDetailChapterCollection
      .find<MangaDetailChapterClient>(
        { detailId: id, type },
        { projection: { href: 0, type: 0, createdAt: 0, updatedAt: 0 } }
      )
      .sort({ chapter: -1 })
      .toArray();
  }

  async getDetailChapterList(id: ObjectId, type: MangaType) {
    return await mangaDetailChapterCollection
      .find<{
        _id: string;
        chapter: number;
      }>({ detailId: id, type }, { projection: { _id: 1, chapter: 1 } })
      .sort({ chapter: -1 })
      .toArray();
  }

  async postDetailChapterCrawl(
    id: ObjectId,
    type: MangaType,
    data: MangaDetailChapterFetch[],
    chapterLimit: number
  ) {
    const manga = MangaService.init(type);

    // update lastest to detail
    const lastest = [...data].sort((a, b) => b.time - a.time).shift();
    if (lastest) {
      await this.putDetailCrawl(id, type, {
        lastestUpdated: lastest.time,
      });
    }

    const order = [...data].sort((a, b) => {
      const ax = a.title.match(/\d+(?:\.?\d+)?/g);
      const x = ax ? parseFloat(ax[0]) : -1;

      const by = b.title.match(/\d+(?:\.?\d+)?/g);
      const y = by ? parseFloat(by[0]) : -1;

      return x - y;
    });

    // loop chapter
    const chapterLength = order.length;
    for (let index = 0; index < chapterLength; index++) {
      if (chapterLimit > 0) {
        if (index == chapterLimit) break;
      }

      const item = order[index];

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

      const handleChapter = async (
        buffer: Buffer | undefined,
        index: number
      ) => {
        const src = await MangaFirebase.addImage(
          buffer,
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
      };

      // loop insert image
      await manga.chapter(item.href, handleChapter);
    }
  }

  async deleteDetailChapterAll(id: ObjectId, type: MangaType) {
    const array = await mangaDetailChapterCollection
      .find({ detailId: id, type }, {})
      .toArray();

    const length = array.length;
    for (let index = 0; index < length; index++) {
      const { _id } = array[index];
      await mangaDetailChapterCollection.deleteOne({ _id });
      await this.deleteDetailChapterImageAll(id, _id, type);
    }
  }

  async deleteDetailChapters(
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
        await this.deleteDetailChapterImageAll(detailId, value._id, type);
      }
    }
  }

  async deleteDetailChapterImageAll(
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
