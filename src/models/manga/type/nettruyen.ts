import * as cheerio from "cheerio";
import { MangaDetailFetch, MangaListFetch, MangaTagFetch } from "types/manga";
import { strUndefined, strEmpty } from "utils/check";
import MangaFactory from "../mangaFactory";
import manga from "../mangaJson.json";
import MangaService from "../mangaService";

export default class Nettruyen extends MangaFactory {
  async tagDescription(href: string) {
    const description = manga[this.type]["tag"]["description"];
    if (!description) return "";
    return cheerio
      .load(await this.fetchWebsite(this.baseUrl + href))(description)
      .text()
      .replaceAll("\n", "")
      .trim();
  }

  async tag(array?: string[] | undefined): Promise<MangaTagFetch[]> {
    const tagJson = manga[this.type]["tag"];

    const link = `${this.baseUrl}${tagJson["pathname"]}`;
    const $ = cheerio.load(await this.fetchWebsite(link));

    const tagMain = $(tagJson["main"]);

    const tags = tagMain
      .find("a")
      .map((_, item) => ({
        href: new URL(strEmpty($(item).attr("href"))).pathname,
        name: $(item).text(),
      }))
      .get()
      .filter(({ name }) => {
        if (!array) return true;

        const result = array.find((item) => item == name);
        if (result) return false;
        else return true;
      });

    if (tagJson["shift"]) tags.shift();

    const list: MangaTagFetch[] = [];
    const length = tags.length;
    for (let index = 0; index < length; index++) {
      const item = tags[index];
      list.push({
        ...item,
        type: this.type,
        description: await this.tagDescription(item.href),
      });
    }

    return list;
  }

  async detail(href: string): Promise<MangaDetailFetch> {
    const link = this.baseUrl + href;
    const $ = cheerio.load(await this.fetchWebsite(link));

    const detailJson = manga[this.type]["detail"];
    const chapterJson = detailJson["chapter"];

    const detailMain = $(detailJson["main"]);
    const chapterMain = $(chapterJson["main"]);

    const authorMainList = $(`${detailJson["author"]} > a`);
    const authorListLength = authorMainList.length;

    const authorExist = (href: string, name: string) => {
      if (href) return [{ href, name }];
      else {
        switch (this.type) {
          case "nettruyen":
          default:
            return [{ href: "", name: "Đang cập nhật" }];
        }
      }
    };

    const thumnailSrc = (src: string = "") => {
      try {
        new URL(src);
        return src;
      } catch (error) {
        switch (this.type) {
          case "nettruyen":
            return `https:${src}`;
          default:
            return src;
        }
      }
    };

    const tags = detailMain
      .find(detailJson["tags"])
      .map((_, item) => ({
        href: new URL(strEmpty($(item).attr("href"))).pathname,
        name: $(item).text(),
      }))
      .get();

    return {
      type: this.type,
      href,
      thumnail: thumnailSrc(
        detailMain.find(detailJson["thumnail"]).attr("src")
      ),
      title: detailMain.find(detailJson["title"]).text(),
      altTitle: strUndefined(detailMain.find(detailJson["altTitle"]).text()),
      authors:
        authorListLength == 0
          ? [{ href: "", name: $(detailJson["author"]).text() }]
          : authorListLength == 1
          ? authorMainList
              .map((_, item) => ({
                href: $(item).attr("href") ?? "",
                name: $(item).text(),
              }))
              .get()
          : authorListLength > 1
          ? authorMainList
              .map((_, item) => ({
                href: $(item).attr("href") ?? "",
                name: $(item).text(),
              }))
              .get()
          : authorExist("", ""),
      status: detailMain.find(detailJson["status"]).text(),
      tags: tags,
      watched: 0,
      followed: 0,
      description: detailMain
        .find(detailJson["description"])
        .text()
        .replaceAll("\n", ""),
      chapters: $(chapterMain)
        .map((_, item) => ({
          href: new URL(
            strEmpty($(item).find(chapterJson["title"]).attr("href"))
          ).pathname,
          title: $(item).find(chapterJson["title"]).text(),
          time: MangaService.timestamp(
            this.type,
            $(item).find(chapterJson["time"]).text()
          ),
          watched: 0,
        }))
        .get(),
    };
  }

  async lastest(page: number = 1): Promise<MangaListFetch> {
    const link = `${this.baseUrl}${
      page !== undefined && page > 1 ? `/page/${page}` : ``
    }`;

    const lastestJson = manga[this.type]["lastest"];
    const itemJson = lastestJson["item"];
    const linkJson = itemJson["link"];
    const pageJson = lastestJson["page"];

    const $ = cheerio.load(await this.fetchWebsite(link));

    const itemMain = $(itemJson["main"]);
    const pageMain = $(pageJson["main"]);

    return {
      totalData: itemMain.length,
      totalPage: parseInt(
        strEmpty(pageMain.find(pageJson["total"]).attr("href")).split(
          "page="
        )[1]
      ),
      currentPage: page,
      canPrev: pageMain.is(pageJson["prev"]),
      canNext: pageMain.is(pageJson["next"]),
      data: itemMain
        .map((_, item) => {
          const anchor = $(item).find(itemJson["href"]);
          const linkMain = $(item).find(linkJson["main"]);

          return {
            href: strEmpty(anchor.attr("href")),
            title: strEmpty(anchor.text()),
            thumnail: strEmpty($(item).find(itemJson["thumnail"]).attr("src")),
            chapters: linkMain
              .map((_, item) => {
                const anchor = $(item).find(linkJson["chapter"]);
                return {
                  href: strEmpty(anchor.attr("href")),
                  title: strEmpty(anchor.text()),
                  time: MangaService.timestamp(
                    this.type,
                    $(item).find(linkJson["time"]).text()
                  ),
                };
              })
              .get(),
          };
        })
        .get(),
    };
  }
}
