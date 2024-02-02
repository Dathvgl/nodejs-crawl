import { Request, Response } from "express";
import { CustomError } from "models/errror";
import MangaFirebase from "models/manga/mangaFirebase";
import MangaMongo from "models/manga/mangaMongo";
import MangaService from "models/manga/mangaService";
import {
  mangaChapterCloneCollection as mangaChapterCloneCollection,
  mangaChapterImageCloneCollection,
  mangaDetailCloneCollection,
  mangaThumnailCloneCollection,
} from "models/mongo";
import { ObjectId } from "mongodb";
import {
  MangaOrder,
  MangaSort,
  MangaType,
  PutManga,
  PutMangaChapterImage,
} from "types/manga";
import { mangaTypes } from "types/variable";
import { momentNowTS } from "utils/date";

const mangaTypeExist = (type?: string) => {
  if (!type || !mangaTypes.includes(type as MangaType)) {
    throw new CustomError("Invalid manga type", 500);
  } else return type as MangaType;
};

export default class MangaController {
  async tagCrawl(req: Request, res: Response) {
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const manga = MangaService.init(mangaType);
    const data = await manga.tag();
    const tags = await mangaMongo.getTags(mangaType);

    if (tags.length == 0) {
      await mangaMongo.postTagsCrawl(data, mangaType);
    } else {
      const filter = data.filter(({ name }) => {
        const result = tags.find((item) => item.name == name);
        if (result) return false;
        else return true;
      });

      if (filter.length != 0) {
        await mangaMongo.postTagsCrawl(filter, mangaType);
      }
    }

    res.json({ total: data.length, data });
  }

  async tag(req: Request, res: Response) {
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getTags(mangaType);
    res.json({ data, total: data.length });
  }

  async chapter(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getDetailChapters(
      new ObjectId(id),
      mangaType
    );

    res.json(data);
  }

  async getChapterImage(req: Request, res: Response) {
    const { detailId, chapterId } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getDetailChapter(
      new ObjectId(detailId),
      new ObjectId(chapterId),
      mangaType
    );

    res.json(data);
  }

  async putChapterImage(req: Request, res: Response) {
    const { detailId, chapterId } = req.params;
    const { type, orders, alts } = req.body as PutMangaChapterImage;

    const mangaType = mangaTypeExist(type);

    // add - remove
    // order - change

    const data = await mangaChapterCloneCollection.findOne<{
      orders: string[];
    }>({
      _id: new ObjectId(chapterId),
      detailId: new ObjectId(detailId),
      type: mangaType,
    });

    console.log(req.files);
    console.log(req.body);

    if (req.files && alts) {
      if (Array.isArray(req.files)) {
        const { length } = alts;

        for (let index = length - 1; index >= 0; index--) {
          const pos = alts[index];
          const { buffer } = req.files[index];

          // New one with emtpy src
          const { insertedId } =
            await mangaChapterImageCloneCollection.insertOne({
              chapterId: new ObjectId(chapterId),
              type,
              src: "",
              createdAt: momentNowTS(),
              updatedAt: momentNowTS(),
            });

          // order push at
          orders?.splice(pos, 0, insertedId.toString());

          const src = await MangaFirebase.addImage({
            buffer,
            detailId,
            chapterId,
            chapterIndex: insertedId.toString(),
            type,
            clone: true,
          });

          // Update src
          await mangaChapterImageCloneCollection.updateOne(
            {
              _id: insertedId,
              chapterId: new ObjectId(chapterId),
              type,
            },
            { $set: { src, chapterIndex: insertedId.toString() } }
          );
        }
      }
    }

    if (data) {
      // Remove old one
      const filter = data.orders.filter((item) => {
        const result = orders?.find((x) => x == item);
        return result == undefined ? true : false;
      });

      for (const item of filter) {
        await MangaFirebase.deleteImage({
          detailId,
          chapterId,
          chapterIndex: item,
          type,
          clone: true,
        });
      }

      // Update new one
      await mangaChapterCloneCollection.updateOne(
        {
          _id: new ObjectId(chapterId),
          detailId: new ObjectId(detailId),
          type: mangaType,
        },
        {
          $set: {
            orders: orders?.map((item) => new ObjectId(item)) ?? [],
            updatedAt: momentNowTS(),
          },
        }
      );
    } else {
      await mangaChapterCloneCollection.insertOne({
        _id: new ObjectId(chapterId),
        detailId: new ObjectId(detailId),
        type: mangaType,
        orders: orders?.map((item) => new ObjectId(item)) ?? [],
        createdAt: momentNowTS(),
        updatedAt: momentNowTS(),
      });
    }

    res.json({ message: "Cập nhật thành công" });
  }

  async thumnail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getThumnail(new ObjectId(id), mangaType);

    res.json(data);
  }

  async detailCrawl(req: Request, res: Response) {
    const { href, type, limit } = req.body as {
      href?: string;
      type?: string;
      limit?: string;
    };

    const chapterLimit = isNaN(parseInt(limit ?? "0"))
      ? 0
      : parseInt(limit ?? "0");

    const mangaType = mangaTypeExist(type);
    if (!href) throw new CustomError("Invalid href", 500);

    const mangaMongo = new MangaMongo();
    const manga = MangaService.init(mangaType);
    const data = await manga.detail(href);

    const detail = await mangaMongo.getDetailExist(data.href, mangaType);
    if (!detail) {
      await mangaMongo.postDetailCrawl(data, mangaType, chapterLimit);
    } else {
      const detailId = new ObjectId(detail._id);
      const chapters = await mangaMongo.getDetailChapterList(
        detailId,
        mangaType
      );

      if (data.thumnail != detail.thumnail) {
        await mangaMongo.putDetailCrawl(detailId, mangaType, {
          thumnail: data.thumnail,
        });

        await mangaMongo.deleteThumnail(detailId, mangaType);
        await mangaMongo.postThumnailCrawl(
          detailId,
          mangaType,
          data.href,
          data.thumnail
        );
      }

      // find new chapter
      const filterNew = data.chapters.filter(({ title }) => {
        const regex = title.match(/\d+(?:\.?\d+)?/g);
        const chapter = regex ? parseFloat(regex[0]) : -1;
        const result = chapters.find((item) => item.chapter == chapter);
        if (result) return false;
        else return true;
      });

      if (filterNew.length != 0) {
        await mangaMongo.postDetailChapterCrawl(
          detailId,
          mangaType,
          filterNew,
          chapterLimit
        );
      }

      // find wrong chapter
      const filterOld = chapters.filter((item) => {
        const result = data.chapters.find(({ title }) => {
          const regex = title.match(/\d+(?:\.?\d+)?/g);
          const chapter = regex ? parseFloat(regex[0]) : -1;
          return item.chapter == chapter;
        });

        if (result) return false;
        else return true;
      });

      if (filterOld.length != 0) {
        await mangaMongo.deleteDetailChapters(
          detailId,
          filterOld.map((item) => item._id),
          mangaType
        );
      }
    }

    res.json(data);
  }

  async getDetail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    if (!id) throw new CustomError("Invalid detail id", 500);

    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getDetail(new ObjectId(id), mangaType);
    res.json(data);
  }

  async getDetailFollow(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    if (!id) throw new CustomError("Invalid detail id", 500);

    const mangaMongo = new MangaMongo();
    const data = await mangaMongo.getDetailFollow(new ObjectId(id), mangaType);

    res.json(data);
  }

  async deleteDetail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    if (!id) throw new CustomError("Invalid detail id", 500);

    const mangaMongo = new MangaMongo();
    const data = await mangaMongo.deleteDetail(new ObjectId(id), mangaType);
    res.json(data);
  }

  async putDetail(req: Request, res: Response) {
    const { id } = req.params;
    const { type, ...rest } = req.body as PutManga;

    const mangaType = mangaTypeExist(type);

    const data = await mangaDetailCloneCollection.findOne({
      _id: new ObjectId(id),
      type,
    });

    if (data) {
      await mangaDetailCloneCollection.updateOne(
        { _id: new ObjectId(id), type: mangaType },
        { $set: { ...rest, updatedAt: momentNowTS() } }
      );
    } else {
      await mangaDetailCloneCollection.insertOne({
        _id: new ObjectId(id),
        type: mangaType,
        ...rest,
        createdAt: momentNowTS(),
        updatedAt: momentNowTS(),
      });
    }

    if (req.file) {
      const detailId = new ObjectId(id);

      const data = await mangaThumnailCloneCollection.findOne({
        detailId,
        type: mangaType,
      });

      const src = await MangaFirebase.addThumnail({
        buffer: req.file.buffer,
        id: id.toString(),
        type,
        clone: true,
      });

      if (data) {
        await mangaThumnailCloneCollection.updateOne(
          { detailId, type: mangaType },
          { $set: { src, updatedAt: momentNowTS() } }
        );
      } else {
        await mangaThumnailCloneCollection.insertOne({
          detailId,
          type: mangaType,
          src,
          createdAt: momentNowTS(),
          updatedAt: momentNowTS(),
        });
      }
    }

    res.json({ message: "Cập nhật truyện" });
  }

  async putDetailChapter(req: Request, res: Response) {
    const { detailId, chapterId } = req.params;

    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.putDetailChapter(
      new ObjectId(detailId),
      new ObjectId(chapterId),
      mangaType
    );

    res.json(data);
  }

  async deleteDetailChapter(req: Request, res: Response) {
    const { detailId, chapterId } = req.params;

    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.deleteDetailChapter(
      new ObjectId(detailId),
      new ObjectId(chapterId),
      mangaType
    );

    res.json(data);
  }

  async lastestCrawl(req: Request, res: Response) {
    const { type, page, limit } = req.body as {
      type?: MangaType;
      page?: number;
      limit?: string;
    };

    const chapterLimit = isNaN(parseInt(limit ?? "0"))
      ? 0
      : parseInt(limit ?? "0");

    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const manga = MangaService.init(mangaType);
    const data = await manga.lastest(page);

    const length = data.data.length;
    for (let index = 0; index < length; index++) {
      const { href } = data.data[index];
      const detailData = await manga.detail(href);

      const detail = await mangaMongo.getDetailExist(
        detailData.href,
        mangaType
      );

      if (!detail) {
        await mangaMongo.postDetailCrawl(detailData, mangaType, chapterLimit);
      } else {
        const detailId = new ObjectId(detail._id);
        const chapters = await mangaMongo.getDetailChapterList(
          detailId,
          mangaType
        );

        if (detailData.thumnail != detail.thumnail) {
          await mangaMongo.putDetailCrawl(detailId, mangaType, {
            thumnail: detailData.thumnail,
          });

          await mangaMongo.deleteThumnail(detailId, mangaType);
          await mangaMongo.postThumnailCrawl(
            detailId,
            mangaType,
            detailData.href,
            detailData.thumnail
          );
        }

        // find new chapter
        const filterNew = detailData.chapters.filter(({ title }) => {
          const regex = title.match(/\d+(?:\.?\d+)?/g);
          const chapter = regex ? parseFloat(regex[0]) : -1;
          const result = chapters.find((item) => item.chapter == chapter);
          if (result) return false;
          else return true;
        });

        if (filterNew.length != 0) {
          await mangaMongo.postDetailChapterCrawl(
            detailId,
            mangaType,
            filterNew,
            chapterLimit
          );
        }

        // find wrong chapter
        const filterOld = chapters.filter((item) => {
          const result = detailData.chapters.find(({ title }) => {
            const regex = title.match(/\d+(?:\.?\d+)?/g);
            const chapter = regex ? parseFloat(regex[0]) : -1;
            return item.chapter == chapter;
          });

          if (result) return false;
          else return true;
        });

        if (filterOld.length != 0) {
          await mangaMongo.deleteDetailChapters(
            detailId,
            filterOld.map((item) => item._id),
            mangaType
          );
        }
      }
    }

    res.json(data);
  }

  async list(req: Request, res: Response) {
    const {
      type,
      page,
      sort,
      order,
      limit,
      keyword,
      includes,
      excludes,
      admin,
    } = req.query as {
      type?: MangaType;
      page?: number;
      sort?: MangaSort;
      order?: MangaOrder;
      limit?: string;
      keyword?: string;
      includes?: string | string[];
      excludes?: string | string[];
      admin?: string;
    };

    const tagIncludes = includes
      ? typeof includes == "string"
        ? [includes]
        : includes
      : [];

    const tagExcludes = excludes
      ? typeof excludes == "string"
        ? [excludes]
        : excludes
      : [];

    const mangaType = mangaTypeExist(type);
    if (!sort) throw new CustomError("Invalid sort manga", 500);
    if (!order) throw new CustomError("Invalid order manga", 500);

    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.mangaList(
      mangaType,
      page,
      sort,
      order,
      tagIncludes,
      tagExcludes,
      limit,
      keyword,
      admin == "true" ? true : false
    );

    res.json(data);
  }
}
