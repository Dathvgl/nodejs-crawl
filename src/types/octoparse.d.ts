import { MangaType } from "./manga";

export type LastestOctoparseClient = {
  href: string;
  title: string;
};

export type ChapterOctoparseClient = {
  type: string;
  href: string;
  hrefChapter: string;
  nameChapter: number;
  timeChapter: number;
};

export type DetailOctoparseServer = {
  href: string;
  title: string;
  thumnail: string;
  altTitle: string;
  status: string;
  description: string;
  hrefAuthor: string;
  nameAuthor: string;
  hrefTag: string;
  nameTag: string;
  hrefChapter: string;
  nameChapter: string;
  timeChapter: string;
};

export type ChapterOctoparseServer = {
  type: MangaType;
  href: string;
  name: string;
  time: string;
  hrefChapter: string;
  imageSrc: string;
};
