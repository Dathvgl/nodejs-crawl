import { envs } from "index";
import {
  aggregateList,
  mangaAuthorCollection,
  mangaChapterCloneCollection,
  mangaDetailChapterCollection,
  mangaDetailChapterImageCollection,
  mangaDetailCloneCollection,
  mangaDetailCollection,
  mangaTagCollection,
  mangaThumnailCloneCollection,
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
  MangaListClientAdmin,
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
    includes: string[],
    excludes: string[],
    limit?: string,
    keyword?: string,
    admin?: boolean
  ) {
    const limitBase = parseInt(envs.LIMIT_LIST ?? "20");
    const limitList = parseInt(limit ?? limitBase.toString());

    await mangaDetailCollection.createIndex({
      title: "text",
      altTitle: "text",
    });

    const tagHandle = () => {
      const includesIds = includes.map((item) => new ObjectId(item));
      const excludesIds = excludes.map((item) => new ObjectId(item));

      if (includesIds.length != 0 && excludesIds.length != 0) {
        return [
          { $match: { "tags._id": { $in: includesIds } } },
          { $match: { "tags._id": { $nin: excludesIds } } },
        ];
      }

      if (includesIds.length != 0) {
        return [{ $match: { "tags._id": { $in: includesIds } } }];
      }

      if (excludesIds.length != 0) {
        return [{ $match: { "tags._id": { $nin: excludesIds } } }];
      }

      return [];
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

    const dataHandle = () => {
      const data: any[] = [
        {
          $lookup: {
            from: "mangaTag",
            localField: "tags",
            foreignField: "_id",
            pipeline: [{ $project: { _id: 1, name: 1 } }],
            as: "tags",
          },
        },
      ];

      if (!admin) {
        data.push(
          ...[
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
          ]
        );
      }

      return data;
    };

    const facetBefore: any[] = [
      { $match: { type } },
      {
        $project: admin
          ? {
              type: 0,
              thumnail: 0,
              altTitle: 0,
              authors: 0,
              description: 0,
            }
          : { type: 0, href: 0, thumnail: 0, altTitle: 0 },
      },
      ...dataHandle(),
      ...tagHandle(),
      ...sortHandle(),
    ];

    if (keyword) {
      facetBefore.unshift({ $match: { $text: { $search: keyword } } });
    }

    const aggregate = aggregateList({
      listHandle: { page, limit: limitList },
      facetBefore,
    });

    return await mangaDetailCollection
      .aggregate<MangaListClient | MangaListClientAdmin>(aggregate)
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

  async getDetail(id: ObjectId, type: MangaType) {
    const aggregate = [
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
    ];

    const data = await mangaDetailCollection
      .aggregate<MangaDetailClient>(aggregate)
      .next();

    const clone = await mangaDetailCloneCollection
      .aggregate<MangaDetailClient>(aggregate)
      .next();

    if (data && clone) {
      for (const [key, value] of Object.entries(clone)) {
        data[key as keyof MangaDetailClient] = value as never;
      }
    }

    return data;
  }

  async getDetailFollow(id: ObjectId, type: MangaType) {
    return await mangaDetailCollection.findOne<{ followed: number }>(
      { _id: id, type },
      { projection: { followed: 1 } }
    );
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

  async putDetailFollow(id: ObjectId, type: MangaType, num: number) {
    const data = (await mangaDetailCollection.findOneAndUpdate(
      { _id: id, type },
      { $inc: { followed: num } },
      { returnDocument: "after" }
    )) as unknown;

    const { value } = data as {
      value: { _id: string; followed: number } | null;
    };

    return !value ? null : { _id: value._id, followed: value.followed };
  }

  async putDetailChapter(
    detailId: ObjectId,
    chapterId: ObjectId,
    type: MangaType
  ) {
    const dataDetail = (await mangaDetailCollection.findOneAndUpdate(
      { _id: detailId, type },
      { $inc: { watched: 1 } },
      { returnDocument: "after" }
    )) as unknown;

    const { value: detailValue } = dataDetail as {
      value: { watched: number } | null;
    };

    const dataChapter = (await mangaDetailChapterCollection.findOneAndUpdate(
      { _id: chapterId, detailId, type },
      { $inc: { watched: 1 } },
      { returnDocument: "after" }
    )) as unknown;

    const { value: chapterValue } = dataChapter as {
      value: { watched: number } | null;
    };

    return {
      detail: !detailValue
        ? null
        : {
            _id: detailId,
            watched: detailValue.watched,
          },
      chapter: !chapterValue
        ? null
        : {
            _id: chapterId,
            watched: chapterValue.watched,
          },
    };
  }

  async deleteDetail(id: ObjectId, type: MangaType) {
    const data = await mangaDetailCollection.findOne<MangaDetailClient>({
      _id: id,
      type,
    });

    await mangaDetailCollection.deleteOne({
      _id: id,
      type,
    });

    await mangaDetailCloneCollection.deleteOne({
      _id: id,
      type,
    });

    await this.deleteThumnail(id, type);
    await this.deleteDetailChapterAll(id, type);

    return data;
  }

  async getThumnail(id: ObjectId, type: MangaType) {
    const clone =
      await mangaThumnailCloneCollection.findOne<MangaThumnailClient>(
        { detailId: id, type },
        { projection: { type: 0, createdAt: 0, updatedAt: 0 } }
      );

    if (clone) return clone;

    const data = await mangaThumnailCollection.findOne<MangaThumnailClient>(
      { detailId: id, type },
      { projection: { type: 0, createdAt: 0, updatedAt: 0 } }
    );

    return data;
  }

  async postThumnailCrawl(
    id: ObjectId,
    type: MangaType,
    href: string,
    thumnail: string
  ) {
    const manga = MangaService.init(type);

    const buffer = await manga.fetchThumnail(manga.baseUrl + href, thumnail);

    const src = await MangaFirebase.addThumnail({
      buffer,
      id: id.toString(),
      type,
    });

    await mangaThumnailCollection.insertOne({
      detailId: id,
      type,
      src,
      createdAt: momentNowTS(),
      updatedAt: momentNowTS(),
    });
  }

  async deleteThumnail(id: ObjectId, type: MangaType) {
    await MangaFirebase.deleteThumnail({ id: id.toString(), type });

    await MangaFirebase.deleteThumnail({
      id: id.toString(),
      type,
      clone: true,
    });

    await mangaThumnailCollection.deleteOne({
      detailId: id,
      type,
    });

    await mangaThumnailCloneCollection.deleteOne({
      detailId: id,
      type,
    });
  }

  async getDetailChapter(
    detailId: ObjectId,
    chapterId: ObjectId,
    type: MangaType
  ) {
    const clone = await mangaChapterCloneCollection
      .aggregate<{
        _id: string;
        index: number;
        orders: {
          _id: string;
          chapterId: string;
          chapterIndex: string;
          src: string;
        };
      }>([
        { $match: { _id: chapterId, detailId, type } },
        {
          $unwind: {
            path: "$orders",
            includeArrayIndex: "index",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "mangaDetailChapterImage",
            localField: "orders",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, chapterId: 1, chapterIndex: 1, src: 1 } },
            ],
            as: "images",
          },
        },
        {
          $lookup: {
            from: "mangaChapterImageClone",
            localField: "orders",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, chapterId: 1, chapterIndex: 1, src: 1 } },
            ],
            as: "imagesClone",
          },
        },
        {
          $project: {
            index: 1,
            orders: {
              $cond: [
                {
                  $eq: [0, { $size: "$imagesClone" }],
                },
                { $first: "$images" },
                { $first: "$imagesClone" },
              ],
            },
          },
        },
        { $sort: { index: 1 } },
      ])
      .toArray();

    const data = await mangaDetailChapterCollection
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

    if (data && clone.length != 0) {
      const array = clone.map((item) => item.orders);

      if (array.length != 0 && data.current) {
        data.current.chapters = array;
      }
    }

    return data;
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
      const x = ax ? parseFloat(ax[ax.length - 1]) : -1;

      const by = b.title.match(/\d+(?:\.?\d+)?/g);
      const y = by ? parseFloat(by[by.length - 1]) : -1;

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
          chapter: chapter ? parseFloat(chapter[chapter.length - 1]) : -1,
          type,
          detailId: id,
          createdAt: momentNowTS(),
          updatedAt: momentNowTS(),
        });

      const handleChapter = async (
        buffer: Buffer | undefined,
        index: number
      ) => {
        const src = await MangaFirebase.addImage({
          buffer,
          detailId: id.toString(),
          chapterId: chapterId.toString(),
          chapterIndex: index.toString(),
          type,
        });

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

    const { length } = array;

    for (let index = 0; index < length; index++) {
      const { _id } = array[index];
      await mangaDetailChapterCollection.deleteOne({ _id });
      await this.deleteDetailChapterImageAll(id, _id, type);
    }
  }

  async deleteDetailChapter(
    detailId: ObjectId,
    chapterId: ObjectId,
    type: MangaType
  ) {
    const data =
      await mangaDetailChapterCollection.findOne<MangaDetailChapterClient>({
        _id: chapterId,
        type,
      });

    if (data?._id) {
      await mangaDetailChapterCollection.deleteOne({ _id: chapterId, type });

      await mangaDetailCollection.updateOne(
        { _id: detailId, type },
        { $inc: { watched: -data.watched } }
      );

      await this.deleteDetailChapterImageAll(
        detailId,
        new ObjectId(data._id),
        type
      );
    }

    return data;
  }

  async deleteDetailChapters(
    detailId: ObjectId,
    chapterIds: string[],
    type: MangaType
  ) {
    const objIds = chapterIds.map((item) => new ObjectId(item));
    const { length } = objIds;

    for (let index = 0; index < length; index++) {
      const item = objIds[index];

      const data =
        await mangaDetailChapterCollection.findOne<MangaDetailChapterClient>({
          _id: item,
          type,
        });

      if (data?._id) {
        await mangaDetailChapterCollection.deleteOne({ _id: item, type });

        await mangaDetailCollection.updateOne(
          { _id: detailId, type },
          { $inc: { watched: -data.watched } }
        );

        await this.deleteDetailChapterImageAll(
          detailId,
          new ObjectId(data._id),
          type
        );
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

    const { length } = list;

    for (let index = 0; index < length; index++) {
      const item = list[index];

      await MangaFirebase.deleteImage({
        detailId: detailId.toString(),
        chapterId: chapterId.toString(),
        chapterIndex: item.chapterIndex.toString(),
        type,
      });
    }

    await mangaDetailChapterImageCollection.deleteMany({ chapterId, type });
  }
}
