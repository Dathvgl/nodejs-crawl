import { envs } from "index";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient(envs.MONGO_URL ?? "");
mongoClient.connect().then(() => console.log("MongoDB connect"));
export const mongoDB = mongoClient.db(envs.MONGO_DB);

export const mangaTagCollection = mongoDB.collection("mangaTag");
export const mangaAuthorCollection = mongoDB.collection("mangaAuthor");
export const mangaThumnailCollection = mongoDB.collection("mangaThumnail");
export const mangaDetailCollection = mongoDB.collection("mangaDetail");

export const mangaDetailChapterCollection =
  mongoDB.collection("mangaDetailChapter");
export const mangaDetailChapterImageCollection = mongoDB.collection(
  "mangaDetailChapterImage"
);

export const userFollowManga = mongoDB.collection("userFollowManga");
