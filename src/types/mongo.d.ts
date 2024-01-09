import { ClientSession } from "mongodb";

export type BaseMongo = {
  _id: string;
  createdAt: number;
  updatedAt: number;
};
