import * as cheerio from "cheerio";
import { Browser, Page, executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import pluginStealth from "puppeteer-extra-plugin-stealth";
import { MangaType } from "types/manga";
import { CustomError } from "./errror";
import manga from "./manga/mangaJson.json";
import { envs } from "index";

puppeteer.use(pluginStealth());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const quality = parseFloat(envs.PUPPETEER_QUALITY ?? "85");
export const execPath = executablePath();

export const args = [
  "--autoplay-policy=user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-extensions-with-background-pages",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-domain-reliability",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-notifications",
  "--disable-offer-store-unmasked-wallet-cards",
  "--disable-popup-blocking",
  "--disable-print-preview",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-setuid-sandbox",
  "--disable-speech-api",
  "--disable-sync",
  "--hide-scrollbars",
  "--ignore-gpu-blacklist",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-default-browser-check",
  "--no-first-run",
  "--no-pings",
  "--no-sandbox",
  "--no-zygote",
  "--password-store=basic",
  "--use-gl=swiftshader",
  "--use-mock-keychain",
];

export default class Puppeteer {
  browser: Promise<Browser>;

  constructor() {
    this.browser = puppeteer.launch({
      headless: "new",
      args,
      defaultViewport: null,
      executablePath: execPath,
    });
  }

  static async chapters(
    type: MangaType,
    url: string,
    callback: (buffer: Buffer | undefined, index: number) => Promise<void>
  ) {
    const browser = puppeteer.launch({
      headless: "new",
      args,
      defaultViewport: null,
      executablePath: execPath,
    });

    const page = await (await browser).newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    const chapterJson = manga[type]["chapter"];
    const buffers: (Buffer | undefined)[] = [];
    const array = await page.$$(chapterJson);
    const length = array.length;

    for (let index = 0; index < length; index++) {
      const item = array[index];
      const boundingBox = await item.boundingBox();

      if (!boundingBox) {
        await callback(undefined, index);
      } else {
        await callback(
          await page.screenshot({
            type: "webp",
            quality,
            optimizeForSpeed: true,
            clip: {
              x: boundingBox.x,
              y: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height,
            },
          }),
          index
        );
      }

      await item.dispose();
    }

    await (await browser).close();
    return buffers;
  }

  static async thumnail(type: MangaType, url: string) {
    const browser = puppeteer.launch({
      headless: "new",
      args,
      defaultViewport: null,
      executablePath: execPath,
    });

    const page = await (await browser).newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    const detailJson = manga[type]["detail"];
    let buffer: Buffer | undefined = undefined;

    const item = await page.$(
      `${detailJson["main"]} ${detailJson["thumnail"]}`
    );

    const boundingBox = await item?.boundingBox();
    console.log(boundingBox);

    if (boundingBox) {
      buffer = await page.screenshot({
        type: "webp",
        quality,
        optimizeForSpeed: true,
        clip: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      });
    }

    await item?.dispose();
    await (await browser).close();
    return buffer;
  }

  static async thumnailOctoparse(url: string) {
    const browser = puppeteer.launch({
      headless: "new",
      args,
      defaultViewport: null,
      executablePath: execPath,
    });

    const page = await (await browser).newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    let buffer: Buffer | undefined = undefined;
    const item = await page.$("img#puppeteer");
    const boundingBox = await item?.boundingBox();

    if (boundingBox) {
      buffer = await page.screenshot({
        type: "webp",
        quality,
        optimizeForSpeed: true,
        clip: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      });
    }

    await item?.dispose();
    await (await browser).close();
    return buffer;
  }

  async goto(url: string) {
    const page = await (await this.browser).newPage();
    await this.abortSource(page);
    await page.goto(url, { waitUntil: "networkidle0" });

    const html = await page.evaluate(() => document.documentElement.innerHTML);
    await this.close(page);

    const $ = cheerio.load(html);
    const cloudflareLength = $("#cf-wrapper").length;

    if (cloudflareLength != 0) {
      throw new CustomError("Cloudflare detect", 500);
    } else return html;
  }

  private async abortSource(page: Page) {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      switch (request.resourceType()) {
        case "ping":
        case "image":
        case "script":
        case "media":
        case "font":
        case "other":
          request.abort();
          break;
        default:
          request.continue();
          break;
      }
    });
  }

  private async close(page: Page) {
    await page.close();
    (await this.browser).close();
  }
}
