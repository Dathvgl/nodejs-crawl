import { envs } from "index";
import { MongoClient } from "mongodb";
import { MongoTransaction } from "types/mongo";
import { CustomError } from "./errror";

const mongoClient = new MongoClient(envs.MONGO_URL ?? "");
mongoClient.connect().then(() => console.log("MongoDB connect"));
export const mongoDB = mongoClient.db(envs.MONGO_DB);

export const transaction = async (
  callback: (opts: MongoTransaction) => Promise<void>
) => {
  const session = mongoClient.startSession();
  session.startTransaction({});

  try {
    await callback({ session, returnOriginal: false });
    console.log("donwwwwwwwwwwwwwwwwwwwww");

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    throw new CustomError("Error transaction", 500);
  }
};

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
