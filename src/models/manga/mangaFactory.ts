import axios from "axios";
import * as cheerio from "cheerio";
import Puppeteer from "models/puppeteer";
import { MangaType } from "types/manga";
import { strExist } from "utils/check";
import manga from "./mangaJson.json";

type FetchType = "puppeteer" | "axios";

export default class MangaFactory {
  type: MangaType;
  baseUrl: string;
  websiteType: FetchType;
  imageType: FetchType;

  constructor(
    type: MangaType,
    baseUrl: string,
    websiteType: FetchType,
    imageType: FetchType
  ) {
    this.type = type;
    this.baseUrl = baseUrl;
    this.websiteType = websiteType;
    this.imageType = imageType;
  }

  async fetchWebsite(url: string) {
    switch (this.websiteType) {
      case "axios":
        return (await axios.get(url)).data as string;
      case "puppeteer":
      default:
        return await new Puppeteer().goto(url);
    }
  }

  async fetchChapter(
    url: string,
    callback: (buffer: Buffer | undefined, index: number) => Promise<void>
  ) {
    switch (this.imageType) {
      case "axios": {
        const $ = cheerio.load(await this.fetchWebsite(url));
        const chapterJson = manga[this.type]["chapter"];

        const array = $(chapterJson);
        const length = array.length;

        for (let index = 0; index < length; index++) {
          const item = array[index];

          try {
            const src = strExist($(item).attr("src"));
            const buffer = (
              await axios.get(src, { responseType: "arraybuffer" })
            ).data;
            await callback(buffer, index);
          } catch (error) {
            await callback(undefined, index);
          }
        }
        return "Axios fetch image";
      }
      case "puppeteer":
      default:
        return await Puppeteer.chapters(this.type, url, callback);
    }
  }

  async fetchThumnail( url: string, thumnail: string) {
    switch (this.imageType) {
      case "axios":
        return (await axios.get(thumnail, { responseType: "arraybuffer" }))
          .data as Buffer;
      case "puppeteer":
      default:
        return await Puppeteer.thumnail(this.type, url);
    }
  }

  async chapter(
    href: string,
    callback: (buffer: Buffer | undefined, index: number) => Promise<void>
  ): Promise<void> {
    const link = this.baseUrl + href;
    await this.fetchChapter(link, callback);
  }
}
