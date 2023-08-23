import CSV from "models/csv";
import {
  mangaDetailChapterCollection,
  mangaDetailChapterImageCollection,
  mangaDetailCollection,
  mangaThumnailCollection,
} from "models/mongo";
import Puppeteer from "models/puppeteer";
import { ObjectId } from "mongodb";
import { MangaDetailFetch, MangaType } from "types/manga";
import { ChapterOctoparseServer, DetailOctoparseServer } from "types/octoparse";
import { strBase64 } from "utils/check";
import { momentNowTS } from "utils/date";
import MangaMongo from "./mangaMongo";
import MangaService from "./mangaService";

type ChapterOctoparseTransfer = {
  detailId: ObjectId;
  type: MangaType;
  chapters: {
    href: string;
    chapter: number;
    time: number;
    src: string[];
  }[];
};

const localClient = "http://localhost:3000";

export default class MangaOctoparse {
  async detail(
    data: DetailOctoparseServer[] | undefined,
    type: MangaType
  ) {
    if (!data) return [];
    const mangaMongo = new MangaMongo();

    const length = data.length;
    const list: MangaDetailFetch[] = [];
    let obj: MangaDetailFetch | null = null;

    const authorExist = (href: string, name: string) => {
      if (href) return [{ href: new URL(href).pathname, name }];
      else {
        switch (type) {
          case "nettruyen":
          default:
            return [{ href: "", name: "Đang cập nhật" }];
        }
      }
    };

    const thumnailHandle = async (detailId: ObjectId, thumnail: string) => {
      const thumnailHref = new URL(localClient + "/manga/puppeteer");
      thumnailHref.searchParams.append("url", thumnail);
      const buffer = await Puppeteer.thumnailOctoparse(thumnailHref.href);
      const array = strBase64(buffer);

      await mangaThumnailCollection.insertOne({
        detailId,
        type,
        base64: array,
        createdAt: momentNowTS(),
        updatedAt: momentNowTS(),
      });
    };

    for (let index = 0; index < length; index++) {
      const item = data[index];

      console.log(
        `null? ${obj == null}`,
        `new href? ${obj?.href == new URL(item.href).pathname}`,
        `index? ${index == length - 1}`
      );

      console.log(obj?.href ?? "", new URL(item.href).pathname);

      if (obj == null) {
        obj = {
          type,
          href: new URL(item.href).pathname,
          thumnail: item.thumnail,
          title: item.title,
          altTitle: item.altTitle,
          status: item.status,
          description: item.description,
          followed: 0,
          watched: 0,
          authors: authorExist(item.hrefAuthor, item.nameAuthor),
          tags: item.hrefTag
            ? [{ href: item.hrefTag, name: item.nameTag }]
            : [],
          chapters: item.hrefChapter
            ? [
                {
                  href: new URL(item.hrefChapter).pathname,
                  title: item.nameChapter,
                  time: MangaService.timestamp(type, item.timeChapter),
                  watched: 0,
                },
              ]
            : [],
        };
      } else {
        if (obj.href == new URL(item.href).pathname) {
          if (item.hrefAuthor) {
            const authorHref = new URL(item.hrefAuthor).pathname;
            const length = obj.authors.length;
            if (length == 0) {
              obj.authors.push({ href: authorHref, name: item.nameTag });
            } else {
              const last = obj.authors[length - 1];
              if (last.href != authorHref) {
                obj.authors.push({ href: authorHref, name: item.nameTag });
              }
            }
          }

          if (item.hrefTag) {
            const tagHref = new URL(item.hrefTag).pathname;
            const length = obj.tags.length;
            if (length == 0) {
              obj.tags.push({ href: tagHref, name: item.nameTag });
            } else {
              const last = obj.tags[length - 1];
              if (last.href != tagHref) {
                obj.tags.push({ href: tagHref, name: item.nameTag });
              }
            }
          }

          if (item.hrefChapter) {
            const chapterHref = new URL(item.hrefChapter).pathname;
            const length = obj.chapters.length;
            if (length == 0) {
              obj.chapters.push({
                href: chapterHref,
                title: item.nameChapter,
                time: MangaService.timestamp(type, item.timeChapter),
                watched: 0,
              });
            } else {
              const last = obj.chapters[length - 1];
              if (last.href != chapterHref) {
                obj.chapters.push({
                  href: chapterHref,
                  title: item.nameChapter,
                  time: MangaService.timestamp(type, item.timeChapter),
                  watched: 0,
                });
              }
            }
          }

          if (index == length - 1) {
            const csv = new CSV({
              dir: "src/local",
              file: "DetailChapter.csv",
              headers: [
                "type",
                "href",
                "hrefChapter",
                "nameChapter",
                "timeChapter",
              ],
            });

            const manga = MangaService.init(type);
            const detail = await mangaMongo.getDetailExist(obj.href, type);
            if (!detail) {
              const { authors, tags, chapters, ...rest } = obj;

              const tagDetail: ObjectId[] = await mangaMongo.putTagsCrawl(
                tags,
                type
              );

              const authorDetail: ObjectId[] = await mangaMongo.putAuthorCrawl(
                authors,
                type
              );

              const { insertedId } = await mangaDetailCollection.insertOne({
                ...rest,
                tags: tagDetail,
                authors: authorDetail,
              });

              await thumnailHandle(insertedId, rest.thumnail);

              const length = chapters.length;
              for (let index = 0; index < length; index++) {
                const item = chapters[index];
                const regex = item.title.match(/\d+(?:\.?\d+)?/g);
                const chapter = regex ? parseFloat(regex[0]) : -1;
                await csv.appendCSV(
                  `"${type}","${insertedId.toString()}","${
                    manga.baseUrl + item.href
                  }","${chapter}","${item.time}"`
                );
              }
            } else {
              const detailId = new ObjectId(detail._id);
              const chapters = await mangaMongo.getDetailChapterList(
                detailId,
                type
              );

              if (obj.thumnail != detail.thumnail) {
                await thumnailHandle(detailId, obj.thumnail);
              }

              if (obj.status != detail.status) {
                await mangaMongo.putDetailCrawl(detailId, type, {
                  status: obj.status,
                });
              }

              // find new chapter
              const filterNew = obj.chapters.filter(({ title }) => {
                const regex = title.match(/\d+(?:\.?\d+)?/g);
                const chapter = regex ? parseFloat(regex[0]) : -1;
                const result = chapters.find((item) => item.chapter == chapter);
                if (result) return false;
                else return true;
              });

              if (filterNew.length != 0) {
                const length = filterNew.length;
                for (let index = 0; index < length; index++) {
                  const item = filterNew[index];
                  const regex = item.title.match(/\d+(?:\.?\d+)?/g);
                  const chapter = regex ? parseFloat(regex[0]) : -1;
                  await csv.appendCSV(
                    `"${type}","${detailId.toString()}","${
                      manga.baseUrl + item.href
                    }","${chapter}","${item.time}"`
                  );
                }
              }

              // find wrong chapter
              const filterOld = chapters.filter((item) => {
                const result = obj?.chapters.find(({ title }) => {
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
                  type
                );
              }
            }

            list.push(obj);
            obj = null;
          }
        } else if (
          obj.href != new URL(item.href).pathname ||
          index == length - 1
        ) {
          const csv = new CSV({
            dir: "src/local",
            file: "DetailChapter.csv",
            headers: [
              "type",
              "href",
              "hrefChapter",
              "nameChapter",
              "timeChapter",
            ],
          });

          const manga = MangaService.init(type);
          const detail = await mangaMongo.getDetailExist(obj.href, type);
          if (!detail) {
            const { authors, tags, chapters, ...rest } = obj;

            const tagDetail: ObjectId[] = await mangaMongo.putTagsCrawl(
              tags,
              type
            );

            const authorDetail: ObjectId[] = await mangaMongo.putAuthorCrawl(
              authors,
              type
            );

            const { insertedId } = await mangaDetailCollection.insertOne({
              ...rest,
              tags: tagDetail,
              authors: authorDetail,
            });

            await thumnailHandle(insertedId, rest.thumnail);

            const length = chapters.length;
            for (let index = 0; index < length; index++) {
              const item = chapters[index];
              const regex = item.title.match(/\d+(?:\.?\d+)?/g);
              const chapter = regex ? parseFloat(regex[0]) : -1;
              await csv.appendCSV(
                `"${type}","${insertedId.toString()}","${
                  manga.baseUrl + item.href
                }","${chapter}","${item.time}"`
              );
            }
          } else {
            const detailId = new ObjectId(detail._id);
            const chapters = await mangaMongo.getDetailChapterList(
              detailId,
              type
            );

            if (obj.thumnail != detail.thumnail) {
              await thumnailHandle(detailId, obj.thumnail);
            }

            if (obj.status != detail.status) {
              await mangaMongo.putDetailCrawl(detailId, type, {
                status: obj.status,
              });
            }

            // find new chapter
            const filterNew = obj.chapters.filter(({ title }) => {
              const regex = title.match(/\d+(?:\.?\d+)?/g);
              const chapter = regex ? parseFloat(regex[0]) : -1;
              const result = chapters.find((item) => item.chapter == chapter);
              if (result) return false;
              else return true;
            });

            if (filterNew.length != 0) {
              const length = filterNew.length;
              for (let index = 0; index < length; index++) {
                const item = filterNew[index];
                const regex = item.title.match(/\d+(?:\.?\d+)?/g);
                const chapter = regex ? parseFloat(regex[0]) : -1;
                await csv.appendCSV(
                  `"${type}","${detailId.toString()}","${
                    manga.baseUrl + item.href
                  }","${chapter}","${item.time}"`
                );
              }
            }

            // find wrong chapter
            const filterOld = chapters.filter((item) => {
              const result = obj?.chapters.find(({ title }) => {
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
                type
              );
            }
          }

          list.push(obj);
          obj = null;
        }
      }
    }

    return list;
  }

  async chapter() {
    const csv = new CSV({
      dir: "src/local",
      file: "LocalChapter.csv",
      headers: ["type", "href", "name", "time", "hrefChapter", "imageSrc"],
    });

    const array = await csv.readCSV<ChapterOctoparseServer>();
    if (!array) return;

    const list: ChapterOctoparseTransfer[] = [];
    const length = array.length;
    let obj: ChapterOctoparseTransfer | null = null;

    for (let index = 0; index < length; index++) {
      const item = array[index];
      const itemId = new ObjectId(item.href);
      const chapterHref = new URL(item.hrefChapter).pathname;

      if (obj == null) {
        obj = {
          detailId: itemId,
          type: item.type,
          chapters: [
            {
              href: chapterHref,
              chapter: parseFloat(item.name),
              time: parseInt(item.time),
              src: [item.imageSrc],
            },
          ],
        };
      } else {
        if (obj.detailId.toString() != itemId.toString()) {
          list.push(obj);
          obj = null;

          obj = {
            detailId: itemId,
            type: item.type,
            chapters: [
              {
                href: chapterHref,
                chapter: parseFloat(item.name),
                time: parseInt(item.time),
                src: [item.imageSrc],
              },
            ],
          };
        } else {
          const index = obj.chapters.length - 1;
          const last = obj.chapters[index];
          if (last.href == chapterHref) {
            obj.chapters[index].src.push(item.imageSrc);
          } else {
            obj.chapters.push({
              href: chapterHref,
              chapter: parseFloat(item.name),
              time: parseInt(item.time),
              src: [item.imageSrc],
            });
          }
        }
      }

      if (index == length - 1) {
        list.push(obj);
      }
    }

    // init puppeteer
    const puppeteer = new Puppeteer();
    const listLength = list.length;
    for (let index = 0; index < listLength; index++) {
      const itemList = list[index];
      const itemLength = itemList.chapters.length;

      for (let index = 0; index < itemLength; index++) {
        const chapter = itemList.chapters[index];

        // insert chapter
        const { insertedId: chapterId } =
          await mangaDetailChapterCollection.insertOne({
            href: chapter.href,
            time: chapter.time,
            watched: 0,
            chapter: chapter.chapter,
            type: itemList.type,
            detailId: itemList.detailId,
            createdAt: momentNowTS(),
            updatedAt: momentNowTS(),
          });

        // url for images
        const url = new URL(localClient + "/manga/puppeteerImage");
        chapter.src.forEach((item) => {
          url.searchParams.append("urls", item);
        });

        // init puppeteer page
        const page = await (await puppeteer.browser).newPage();
        await page.goto(url.href, { waitUntil: "networkidle0" });

        // buffer and list element
        const buffers: (Buffer | undefined)[] = [];
        const array = await page.$$("img.puppeteer");
        const arrayLength = array.length;

        for (let index = 0; index < arrayLength; index++) {
          const item = array[index];
          const boundingBox = await item.boundingBox();

          if (!boundingBox) {
            buffers.push(undefined);
          } else {
            buffers.push(
              await page.screenshot({
                type: "webp",
                quality: 85,
                optimizeForSpeed: true,
                clip: {
                  x: boundingBox.x,
                  y: boundingBox.y,
                  width: boundingBox.width,
                  height: boundingBox.height,
                },
              })
            );
          }

          await item.dispose();
        }

        // loop insert image
        const bufferLength = buffers.length;
        for (let index = 0; index < bufferLength; index++) {
          const item = buffers[index];
          const array = strBase64(item);

          await mangaDetailChapterImageCollection.insertOne({
            chapterId,
            chapterIndex: index,
            type: itemList.type,
            base64: array,
            createdAt: momentNowTS(),
            updatedAt: momentNowTS(),
          });
        }
      }
    }

    await (await puppeteer.browser).close();

    return list;
  }
}
