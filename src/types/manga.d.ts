import { BaseMongo } from "./mongo";

export type MangaType = "nettruyen" | "blogtruyen";
export type MangaSort = "lastest" | "chapter" | "name";
export type MangaOrder = "asc" | "desc";
export type MangaLink = { href: string; name: string };
export type MangaIndex = { _id: string; chapter: number };
export type MangaLinkClient = { _id: string; name: string };

export type MangaListResult<T> = {
  totalData: number;
  totalPage: number | null;
  currentPage: number;
  canPrev: boolean;
  canNext: boolean;
  data: T[];
};

export type MangaListFetch = MangaListResult<{
  href: string;
  title: string;
  thumnail: string;
  chapters: {
    href: string;
    title: string;
    time: number;
  }[];
}>;

export type MangaDetailFetch = {
  type: MangaType;
  href: string;
  thumnail: string;
  title: string;
  altTitle?: string;
  authors: MangaLink[];
  status: string;
  tags: MangaLink[];
  watched: number;
  followed: number;
  description: string;
  chapters: MangaDetailChapterFetch[];
};

export type MangaDetailChapterFetch = {
  href: string;
  title: string;
  time: number;
  watched: number;
};

export type MangaTagFetch = {
  name: string;
  href: string;
  type: MangaType;
  description: string;
};

export type MangaAuthorFetch = {
  name: string;
  href: string;
  type: MangaType;
};

export type MangaTagMongo = BaseMongo & MangaTagFetch;
export type MangaAuthorMongo = BaseMongo & MangaAuthorFetch;
export type MangaThumnailMongo = BaseMongo & {
  detailId: string;
  type: MangaType;
  src: string;
};
export type MangaDetailMongo = BaseMongo &
  Omit<MangaDetailFetch, "tags" | "authors" | "chapters"> & {
    lastestUpdated: number;
  };
export type MangaDetailChapterMongo = BaseMongo &
  Omit<MangaDetailChapterFetch, "href" | "title"> & {
    detailId: string;
    type: MangaType;
    chapter: number;
  };
export type MangaDetailChapterImageMongo = BaseMongo & {
  chapterId: string;
  chapterIndex: number;
  type: MangaType;
  src: string;
};

export type MangaTagClient = Omit<
  MangaTagMongo,
  "href" | "type" | "createdAt" | "updatedAt"
>;
export type MangaAuthorClient = Omit<
  MangaAuthorMongo,
  "href" | "type" | "createdAt" | "updatedAt"
>;
export type MangaThumnailClient = Omit<
  MangaThumnailMongo,
  "type" | "createdAt" | "updatedAt"
>;
export type MangaDetailClient = Omit<
  MangaDetailMongo,
  "href" | "type" | "thumnail" | "createdAt" | "updatedAt"
> & {
  authors: MangaLinkClient[];
  tags: (MangaLinkClient & { description: string })[];
};
export type MangaDetailChapterClient = Omit<
  MangaDetailChapterMongo,
  "type" | "createdAt" | "updatedAt"
>;
export type MangaDetailChapterImageClient = Omit<
  MangaDetailChapterImageMongo,
  "type" | "createdAt" | "updatedAt"
>;
export type MangaListClient = MangaListResult<
  Omit<MangaDetailClient, "altTitle"> & {
    chapters: { _id: string; chapter: number; time: number }[];
  }
>;
export type MangaChapterClient = {
  canPrev: MangaIndex | null;
  canNext: MangaIndex | null;
  current: {
    _id: string;
    chapter: number;
    chapters: {
      _id: string;
      chapterId: string;
      chapterIndex: string;
      src: string;
    }[];
  } | null;
  chapters: MangaIndex[];
};
