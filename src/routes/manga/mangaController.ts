import { Request, Response } from "express";
import CSV from "models/csv";
import { CustomError } from "models/errror";
import MangaMongo from "models/manga/mangaMongo";
import MangaOctoparse from "models/manga/mangaOctoparse";
import MangaService from "models/manga/mangaService";
import { ObjectId } from "mongodb";
import { MangaOrder, MangaSort, MangaType } from "types/manga";
import { DetailOctoparseServer } from "types/octoparse";
import { mangaTypes } from "types/variable";

const mangaTypeExist = (type?: string) => {
  if (!type || !mangaTypes.includes(type as MangaType)) {
    throw new CustomError("Invalid manga type", 500);
  } else return type as MangaType;
};

abstract class MangaController {
  static async test(req: Request, res: Response) {
    // const browser = puppeteer.launch({
    //   headless: "new",
    //   args,
    //   defaultViewport: null,
    //   executablePath: execPath,
    // });

    // const url = new URL("http://localhost:3000/manga/puppeteer");
    // url.searchParams.append(
    //   "url",
    //   "https://i221.ntcdntempv3.com/data/images/88637/1025543/015-20829c9.jpg?data=net"
    // );

    // const page = await (await browser).newPage();
    // await page.goto(url.href, { waitUntil: "networkidle0" });

    // let buffer: Buffer | undefined = undefined;
    // const item = await page.$("img#puppeteer");
    // const boundingBox = await item?.boundingBox();

    // if (boundingBox) {
    //   buffer = await page.screenshot({
    //     type: "webp",
    //     quality: 85,
    //     optimizeForSpeed: true,
    //     clip: {
    //       x: boundingBox.x,
    //       y: boundingBox.y,
    //       width: boundingBox.width,
    //       height: boundingBox.height,
    //     },
    //   });
    // }

    // await item?.dispose();
    // await (await browser).close();

    // if (buffer) {
    //   const file = buckets[1].file("test.jpg");
    //   await file.save(buffer, { contentType: "image/jpeg" });
    //   const link = await getDownloadURL(file);
    //   console.log(link);
    // }

    res.json({});
  }

  static async tagCrawl(req: Request, res: Response) {
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const manga = MangaService.init(mangaType);
    const data = await manga.tag();
    const tags = await MangaMongo.getTags(mangaType);

    if (tags.length == 0) {
      await MangaMongo.postTagsCrawl(data, mangaType);
    } else {
      const filter = data.filter(({ name }) => {
        const result = tags.find((item) => item.name == name);
        if (result) return false;
        else return true;
      });

      if (filter.length != 0) {
        await MangaMongo.postTagsCrawl(filter, mangaType);
      }
    }

    res.json({ total: data.length, data });
  }

  static async tag(req: Request, res: Response) {
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const data = await MangaMongo.getTags(mangaType);
    res.json({ data, total: data.length });
  }

  static async chapterOctoparse(req: Request, res: Response) {
    const t = await MangaOctoparse.chapter();
    res.json({ t });
  }

  static async chapter(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const data = await MangaMongo.getDetailChapters(
      new ObjectId(id),
      mangaType
    );

    res.json(data);
  }

  static async chapterImage(req: Request, res: Response) {
    const { detailId, chapterId } = req.params;

    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const data = await MangaMongo.getDetailChapter(
      new ObjectId(detailId),
      new ObjectId(chapterId),
      mangaType
    );

    res.json(data);
  }

  static async thumnail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const data = await MangaMongo.getThumnail(new ObjectId(id), mangaType);
    res.json(data);
  }

  static async detailCrawl(req: Request, res: Response) {
    const { href, type } = req.query as {
      href?: string;
      type?: string;
    };

    const mangaType = mangaTypeExist(type);
    if (!href) throw new CustomError("Invalid href", 500);

    const manga = MangaService.init(mangaType);
    const data = await manga.detail(href);

    const detail = await MangaMongo.getDetailExist(data.href, mangaType);
    if (!detail) {
      await MangaMongo.postDetailCrawl(data, mangaType);
    } else {
      const detailId = new ObjectId(detail._id);
      const chapters = await MangaMongo.getDetailChapterList(
        detailId,
        mangaType
      );

      if (data.thumnail != detail.thumnail) {
        await MangaMongo.putDetailCrawl(detailId, mangaType, {
          thumnail: data.thumnail,
        });

        await MangaMongo.deleteThumnail(detailId, mangaType);
        await MangaMongo.postThumnailCrawl(detailId, mangaType, data.href);
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
        await MangaMongo.postDetailChapterCrawl(detailId, mangaType, filterNew);
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
        await MangaMongo.deleteDetailChapters(
          detailId,
          filterOld.map((item) => item._id),
          mangaType
        );
      }
    }

    res.json(data);
  }

  static async getDetail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    if (!id) throw new CustomError("Invalid detail id", 500);

    const data = await MangaMongo.getDetail(new ObjectId(id), mangaType);
    res.json(data);
  }

  static async deleteDetail(req: Request, res: Response) {
    const { id } = req.params;
    const { type } = req.query as { type?: MangaType };

    const mangaType = mangaTypeExist(type);
    if (!id) throw new CustomError("Invalid detail id", 500);

    await MangaMongo.deleteDetail(new ObjectId(id), mangaType);
    res.send("Delete Manga");
  }

  static async lastestOctoparse(req: Request, res: Response) {
    const { type } = req.query as { type?: MangaType };
    const mangaType = mangaTypeExist(type);

    const csv = new CSV({
      dir: "src/local",
      file: "LastestLocal.csv",
      headers: true,
    });

    const data = await csv.readCSV<DetailOctoparseServer>();
    const list = await MangaOctoparse.detail(data, mangaType);
    res.json({ totalData: list.length, data: list });
  }

  static async lastestCrawl(req: Request, res: Response) {
    const { type, page, sort } = req.query as {
      type?: MangaType;
      page?: number;
      sort?: MangaSort;
    };

    const mangaType = mangaTypeExist(type);

    const manga = MangaService.init(mangaType);
    const data = await manga.lastest(page);

    const length = data.data.length;
    for (let index = 0; index < length; index++) {
      const { href } = data.data[index];
      const detailData = await manga.detail(href);

      const detail = await MangaMongo.getDetailExist(
        detailData.href,
        mangaType
      );

      if (!detail) {
        await MangaMongo.postDetailCrawl(detailData, mangaType);
      } else {
        const detailId = new ObjectId(detail._id);
        const chapters = await MangaMongo.getDetailChapterList(
          detailId,
          mangaType
        );

        if (detailData.thumnail != detail.thumnail) {
          await MangaMongo.putDetailCrawl(detailId, mangaType, {
            thumnail: detailData.thumnail,
          });

          await MangaMongo.deleteThumnail(detailId, mangaType);
          await MangaMongo.postThumnailCrawl(
            detailId,
            mangaType,
            detailData.href
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
          await MangaMongo.postDetailChapterCrawl(
            detailId,
            mangaType,
            filterNew
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
          await MangaMongo.deleteDetailChapters(
            detailId,
            filterOld.map((item) => item._id),
            mangaType
          );
        }
      }
    }

    res.json(data);
  }

  static async list(req: Request, res: Response) {
    const { type, page, sort, order, keyword, tag } = req.query as {
      type?: MangaType;
      page?: number;
      sort?: MangaSort;
      order?: MangaOrder;
      keyword?: string;
      tag?: string;
    };

    const mangaType = mangaTypeExist(type);
    if (!sort) throw new CustomError("Invalid sort manga", 500);
    if (!order) throw new CustomError("Invalid order manga", 500);

    const data = await MangaMongo.mangaList(
      mangaType,
      page,
      sort,
      order,
      keyword,
      tag ? tag.split(",") : undefined
    );

    res.json(data);
  }
}

export default MangaController;
