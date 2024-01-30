import { envs } from "index";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient(envs.MONGO_URL ?? "");
mongoClient.connect().then(() => console.log("MongoDB connect"));
export const mongoDB = mongoClient.db(envs.MONGO_DB);

// -----

// User
export const userCollection = mongoDB.collection("user");
export const userFollowMangaCollection = mongoDB.collection("userFollowManga");

// Role
export const roleCollection = mongoDB.collection("role");
export const roleTypeCollection = mongoDB.collection("roleType");

// Manga
export const mangaTagCollection = mongoDB.collection("mangaTag");
export const mangaAuthorCollection = mongoDB.collection("mangaAuthor");

export const mangaDetailCollection = mongoDB.collection("mangaDetail");
export const mangaThumnailCollection = mongoDB.collection("mangaThumnail");

export const mangaDetailChapterCollection =
  mongoDB.collection("mangaDetailChapter");

export const mangaDetailChapterImageCollection = mongoDB.collection(
  "mangaDetailChapterImage"
);

// Clone
export const mangaDetailCloneCollection =
  mongoDB.collection("mangaDetailClone");

export const mangaThumnailCloneCollection =
  mongoDB.collection("mangaThumnailClone");

export const mangaChapterCloneCollection =
  mongoDB.collection("mangaChapterClone");

export const mangaChapterImageCloneCollection = mongoDB.collection(
  "mangaChapterImageClone"
);

// -----

type FieldLookup = {
  document: string;
  as?: string;
  field: string;
  project?: { $project: Record<string, any> };
  array?: boolean;
};

export function fieldLookup({
  document,
  as,
  field,
  project,
  array,
}: FieldLookup) {
  const pipeline: any[] = [];

  if (project) pipeline.push(project);

  const aggregate = [
    {
      $lookup: {
        from: document,
        localField: field,
        foreignField: "_id",
        pipeline,
        as: as ?? document,
      },
    },
    { $addFields: { [as ?? document]: { $first: `$${as ?? document}` } } },
  ];

  if (array) aggregate.pop();
  return aggregate;
}

type AggregateListProps = {
  dataHandle?: any[];
  facetBefore?: any[];
  facetAfter?: any[];
  listHandle: {
    page: number;
    limit: number;
  };
};

export function aggregateList({
  listHandle,
  dataHandle,
  facetBefore,
  facetAfter,
}: AggregateListProps) {
  const { page, limit } = listHandle;

  const data: any[] = [{ $skip: (page - 1) * limit }, { $limit: limit }];

  if (dataHandle && dataHandle?.length != 0) {
    data.unshift(...dataHandle);
  }

  const aggregate: any[] = [
    {
      $facet: {
        data,
        total: [{ $count: "total" }],
      },
    },
    { $addFields: { currentPage: page } },
    {
      $project: {
        totalData: {
          $let: {
            vars: { props: { $first: "$total" } },
            in: "$$props.total",
          },
        },
        currentPage: 1,
        canPrev: { $not: { $eq: ["$currentPage", 1] } },
        data: 1,
      },
    },
    {
      $addFields: {
        totalPage: { $ceil: { $divide: ["$totalData", limit] } },
      },
    },
    {
      $addFields: {
        canNext: {
          $and: [
            { $not: { $eq: ["$currentPage", "$totalPage"] } },
            { $not: { $eq: [null, "$totalPage"] } },
          ],
        },
      },
    },
  ];

  if (facetBefore && facetBefore?.length != 0) {
    aggregate.unshift(...facetBefore);
  }

  if (facetAfter && facetAfter?.length != 0) {
    aggregate.push(...facetAfter);
  }

  return aggregate;
}
