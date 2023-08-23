import { ListResult } from "./base";
import { MangaType } from "./manga";
import { BaseMongo } from "./mongo";

export type UserFollowMangaMongo = BaseMongo & {
  userId: string;
  mangaId: string;
  type: MangaType;
};

export type UserListFollowMangaClient = ListResult<{
  _id: string;
  title: string;
  lastestUpdated: number;
  chapters: {
    _id: string;
    chapter: number;
    time: number;
  }[];
}>;
