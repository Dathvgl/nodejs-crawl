import csv from "csv";
import fs from "fs";
import { From, To, replaceInFile } from "replace-in-file";

export type CSVProps = {
  dir: string;
  file: string;
  headers: string[] | boolean;
};

export default class CSV {
  dir: string;
  file: string;
  headers: string[] | boolean;

  constructor(props: CSVProps) {
    const { dir, file, headers } = props;

    this.dir = dir;
    this.file = file;
    this.headers = headers;

    this.init();
  }

  private init() {
    return new Promise((resolve, reject) => {
      const path = `${this.dir}/${this.file}`;
      if (fs.existsSync(path)) {
        resolve("Success");
        return;
      }

      fs.mkdirSync(this.dir, { recursive: true });

      if (typeof this.headers == "boolean") {
        resolve("Success");
        return;
      }

      try {
        fs.writeFile(
          `${this.dir}/${this.file}`,
          `${this.headers.join(",")}\n`,
          {
            flag: "a",
            encoding: "utf-8",
          },
          (error) => {
            if (error) console.log(error);
          }
        );

        resolve("Success");
      } catch (error) {
        reject("Error append");
      }
    });
  }

  async appendCSV(str: string) {
    const path = `${this.dir}/${this.file}`;
    await this.init();

    fs.appendFile(
      path,
      `${str}\n`,
      {
        flag: "a",
        encoding: "utf-8",
      },
      (error) => {
        if (error) console.log(error);
      }
    );
  }

  async readCSV<T>() {
    const path = `${this.dir}/${this.file}`;
    if (!fs.existsSync(path)) return;

    const array: T[] = [];
    return new Promise<T[]>((resolve, reject) => {
      const parse = csv.parse({
        columns: this.headers,
        delimiter: ",",
        relaxQuotes: true,
        skipEmptyLines: true,
        relaxColumnCount: true,
        skipRecordsWithError: true,
      });

      fs.createReadStream(path, { autoClose: true, encoding: "utf8" })
        .pipe(parse)
        .on("data", (row) => array.push(row))
        .on("end", () => {
          if (this.headers) array.shift();
          resolve(array);
        })
        .on("error", (error) => {
          console.log(error);
          reject(error);
        });
    });
  }
}
