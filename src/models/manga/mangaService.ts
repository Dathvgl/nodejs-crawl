import { envs } from "index";
import moment from "moment";
import { MangaType } from "types/manga";
import { numFromStr, strExist } from "utils/check";
import { momentNowTS } from "utils/date";
import Nettruyen from "./type/nettruyen";
import Blogtruyen from "./type/blogtruyen";

export default class MangaService {
  static init(type: MangaType) {
    switch (type) {
      case "blogtruyen":
        return new Blogtruyen(
          type,
          strExist(envs.BLOGTRUYEN),
          "axios",
          "axios"
        );
      case "nettruyen":
      default:
        return new Nettruyen(type, strExist(envs.NETTRUYEN), "axios", "axios");
    }
  }

  static timestamp(type: MangaType, str?: string) {
    if (!str) return momentNowTS();

    switch (type) {
      case "blogtruyen": {
        const split = str.split(" ");
        const time = split[1];
        const date = split[0].split("/");

        return parseInt(
          moment(new Date(`${date[1]}/${date[0]}/${date[2]} ${time}`)).format(
            "X"
          )
        );
      }
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

        if (str.includes("năm")) {
          const second = numFromStr(str) * 365 * 24 * 60 * 60;
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
