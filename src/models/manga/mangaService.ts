import { envs } from "index";
import moment from "moment";
import { MangaType } from "types/manga";
import { numStrTime, strEmpty } from "utils/check";
import { momentNowTS } from "utils/date";
import Blogtruyen from "./type/blogtruyen";
import Nettruyen from "./type/nettruyen";

export default class MangaService {
  static init(type: MangaType) {
    switch (type) {
      case "blogtruyen":
        return new Blogtruyen(
          type,
          strEmpty(envs.BLOGTRUYEN),
          "axios",
          "axios"
        );
      case "nettruyen":
      default:
        return new Nettruyen(type, strEmpty(envs.NETTRUYEN), "axios", "axios");
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
          const second = numStrTime(str);
          return momentNowTS() - second;
        }

        if (str.includes("phút")) {
          const second = numStrTime(str) * 60;
          return momentNowTS() - second;
        }

        if (str.includes("giờ")) {
          const second = numStrTime(str) * 60 * 60;
          return momentNowTS() - second;
        }

        if (str.includes("ngày")) {
          const second = numStrTime(str) * 24 * 60 * 60;
          return momentNowTS() - second;
        }

        if (str.includes("tháng")) {
          const second = numStrTime(str) * 30 * 24 * 60 * 60;
          return momentNowTS() - second;
        }

        if (str.includes("năm")) {
          const second = numStrTime(str) * 365 * 24 * 60 * 60;
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
