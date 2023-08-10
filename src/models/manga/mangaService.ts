import { envs } from "index";
import moment from "moment";
import { MangaType } from "types/manga";
import { numFromStr } from "utils/check";
import { momentNowTS } from "utils/date";
import Nettruyen from "./nettruyen";
import Blogtruyen from "./blogtruyen";

export default class MangaService {
  static init(type: MangaType) {
    switch (type) {
      case "blogtruyen":
        return new Blogtruyen(type, envs.BLOGTRUYEN);
      case "nettruyen":
      default:
        return new Nettruyen(type, envs.NETTRUYEN);
    }
  }

  static timestamp(type: MangaType, str?: string) {
    if (!str) return momentNowTS();

    switch (type) {
      case "blogtruyen":
        return parseInt(moment(new Date("01/05/2023 20:04")).format("X"));
      case "nettruyen":
      default: {
        if (str.includes("giây")) {
          const second = numFromStr(str);
          return momentNowTS() - second;
        }

        if (str.includes("phút")) {
          const second = numFromStr(str) * 60;
          return momentNowTS() - second;
        }

        if (str.includes("giờ")) {
          const second = numFromStr(str) * 60 * 60;
          return momentNowTS() - second;
        }

        if (str.includes("ngày")) {
          const second = numFromStr(str) * 24 * 60 * 60;
          return momentNowTS() - second;
        }

        if (str.includes(":")) {
          const split = str.split(" ");
          const time = `${split[0]}:00`;
          const date = split[1].split("/");
          const year = new Date().getFullYear();

          return parseInt(
            moment(`${year}-${date[1]}-${date[0]} ${time}`).format("X")
          );
        }

        if (str.includes("/")) {
          const split = str.split("/");
          return parseInt(
            moment(
              `${
                split[2].length == 2
                  ? `20${split[2]}`
                  : split[2].length == 3
                  ? `2${split[2]}`
                  : split[2]
              }-${split[1]}-${split[0]}`
            ).format("X")
          );
        }

        if (!isNaN(parseInt(str))) {
          return parseInt(str);
        } else return momentNowTS();
      }
    }
  }
}
