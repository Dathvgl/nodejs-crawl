import { Request } from "express";

export type KeysOfType<T, K> = {
  [P in keyof T]: T[P] extends K ? P : never;
}[keyof T];

export type ListResult<T> = {
  totalData: number;
  totalPage: number | null;
  currentPage: number;
  canPrev: boolean;
  canNext: boolean;
  data: T[];
};

export type RequestAuthHandler = Request & { uid?: string };
