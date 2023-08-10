import * as cheerio from "cheerio";
import Puppeteer from "models/puppeteer";
import { MangaDetailPuppeteer, MangaListPuppeteer } from "types/manga";
import { strEmpty, strExist } from "utils/check";
import MangaFactory from "./mangaFactory";
import manga from "./mangaJson.json";
import MangaService from "./mangaService";

export default class Blogtruyen extends MangaFactory {
  async detail(href: string): Promise<MangaDetailPuppeteer> {
    const link = this.baseUrl + href;
    const puppeteer = new Puppeteer();
    const html = await puppeteer.goto(link);

    const detailJson = manga[this.type]["detail"];
    const chapterJson = detailJson["chapter"];
    const $ = cheerio.load(html);

    const detailMain = $(detailJson["main"]);
    const chapterMain = $(chapterJson["main"]);

    const tags = detailMain
      .find(detailJson["tags"])
      .map((_, item) => ({
        href: strExist($(item).attr("href")),
        name: $(item).text(),
      }))
      .get();

    return {
      type: this.type,
      href,
      thumnail: strExist(detailMain.find(detailJson["thumnail"]).attr("src")),
      title: detailMain
        .find(detailJson["title"])
        .contents()
        .filter((nodeType) => nodeType == 2)
        .map(function () {
          return $(this).text().trim();
        })
        .get()
        .join("")
        .replace(">", "")
        .trim(),
      altTitle: strEmpty(detailMain.find(detailJson["altTitle"]).text()),
      authors: $(detailJson["author"])
        .map((_, item) => ({
          href: $(item).attr("href") ?? "",
          name: $(item).text(),
        }))
        .get(),
      status: detailMain.find(detailJson["status"]).text(),
      tags: tags,
      watched: 0,
      followed: 0,
      description: detailMain
        .find(detailJson["description"])
        .text()
        .replaceAll("\n", "")
        .trim(),
      chapters: $(chapterMain)
        .map((_, item) => ({
          href: strExist($(item).find(chapterJson["title"]).attr("href")),
          title: $(item).find(chapterJson["title"]).text().trim(),
          time: MangaService.timestamp(
            this.type,
            $(item).find(chapterJson["time"]).text()
          ),
          watched: 0,
        }))
        .get(),
    };
  }

  async lastest(page: number = 1): Promise<MangaListPuppeteer> {
    const link = `${this.baseUrl}${
      page !== undefined && page > 1 ? `/page/${page}` : ``
    }`;

    const puppeteer = new Puppeteer();
    const html = await puppeteer.goto(link);

    const lastestJson = manga[this.type]["lastest"];
    const itemJson = lastestJson["item"];
    const pageJson = lastestJson["page"];

    const $ = cheerio.load(html);

    const itemMain = $(itemJson["main"]);
    const pageMain = $(pageJson["main"]);

    return {
      totalData: itemMain.length,
      totalPage:
        pageMain.find(pageJson["total"]).length == 0
          ? parseInt(
              strExist(
                pageMain
                  .find("select > option:last-child")
                  .attr("value")
                  ?.split("page-")[1]
              )
            )
          : parseInt(
              strExist(pageMain.find(pageJson["total"]).attr("href")).split(
                "page-"
              )[1]
            ),
      currentPage: page,
      canPrev: pageMain.find(pageJson["prev"]).length == 0 ? false : true,
      canNext: pageMain.find(pageJson["next"]).length == 0 ? false : true,
      data: itemMain
        .map((_, item) => {
          const anchor = $(item).find(itemJson["href"]);

          return {
            href: strExist(anchor.attr("href")),
            title: strExist(anchor.text()),
            thumnail: strExist($(item).find(itemJson["thumnail"]).attr("src")),
            chapters: [],
          };
        })
        .get(),
    };
  }
}
