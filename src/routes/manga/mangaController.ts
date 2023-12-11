import { Request, Response } from "express";
import { CustomError } from "models/errror";
import MangaMongo from "models/manga/mangaMongo";
import MangaService from "models/manga/mangaService";
import { ObjectId } from "mongodb";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { mangaTypes } from "types/variable";

const mangaTypeExist = (type?: string) => {
  if (!type || !mangaTypes.includes(type as MangaType)) {
    throw new CustomError("Invalid manga type", 500);
  } else return type as MangaType;
};

class MangaController {
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

  async chapterImage(req: Request, res: Response) {
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

  async thumnail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);
    const mangaMongo = new MangaMongo();

    const data = await mangaMongo.getThumnail(new ObjectId(id), mangaType);
    res.json(data);
  }

  async detailCrawl(req: Request, res: Response) {
    const { href, type, limit } = req.query as {
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

    res.send(data);
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
    const { type, page, limit } = req.query as {
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
    const { type, page, sort, order, limit, keyword, includes, excludes } =
      req.query as {
        type?: MangaType;
        page?: number;
        sort?: MangaSort;
        order?: MangaOrder;
        limit?: string;
        keyword?: string;
        includes?: string | string[];
        excludes?: string | string[];
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
      keyword
    );

    res.json(data);
  }
}

export default MangaController;
