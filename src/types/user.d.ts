import { ListResult } from "./base";
import { MangaType } from "./manga";
import { BaseMongo } from "./mongo";
import { RoleMongo } from "./role";

export type UserType = {
  _id: string;
  uid: string;
  name?: string;
  email?: string;
  thumnail?: string;
  gender?: string;
  birth?: number;
  roles: Pick<RoleMongo, "_id" | "name">[];
};

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

export type UserMessage = Pick<UserType, "_id" | "uid" | "name" | "thumnail">;
