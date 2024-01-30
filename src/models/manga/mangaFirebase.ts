import { FirebaseError } from "firebase-admin";
import { getDownloadURL } from "firebase-admin/storage";
import { buckets } from "models/firebase/firebaseService";
import { MangaType } from "types/manga";

type AddThumnailProps = {
  buffer: Buffer | undefined;
  id: string;
  type: MangaType;
  clone?: boolean;
};

type DeleteThumnailProps = {
  id: string;
  type: MangaType;
  clone?: boolean;
};

type AddImageProps = {
  buffer: Buffer | undefined;
  detailId: string;
  chapterId: string;
  chapterIndex: string;
  type: MangaType;
  clone?: boolean;
};

type DeleteImageProps = {
  detailId: string;
  chapterId: string;
  chapterIndex: string;
  type: MangaType;
  clone?: boolean;
};

export default class MangaFirebase {
  static async addThumnail({ buffer, id, type, clone }: AddThumnailProps) {
    if (!buffer) return "";
    const { length } = buckets;

    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];

      try {
        const file = bucket.file(
          `${type}/${id}/${clone ? "thumbnailClone.jpg" : "thumbnail.jpg"}`
        );

        await file.save(buffer, { contentType: "image/jpeg" });
        return await getDownloadURL(file);
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }

    return "";
  }

  static async deleteThumnail({ id, type, clone }: DeleteThumnailProps) {
    const { length } = buckets;

    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];

      try {
        await bucket
          .file(
            `${type}/${id}/${clone ? "thumbnailClone.jpg" : "thumbnail.jpg"}`
          )
          .delete();

        return;
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }
  }

  static async addImage({
    buffer,
    type,
    detailId,
    chapterId,
    chapterIndex,
    clone,
  }: AddImageProps) {
    if (!buffer) return "";
    const { length } = buckets;

    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];

      try {
        const file = bucket.file(
          `${type}/${detailId}/${chapterId}/${chapterIndex}${
            clone ? "Clone" : ""
          }.jpg`
        );

        await file.save(buffer, { contentType: "image/jpeg" });
        return await getDownloadURL(file);
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }

    return "";
  }

  static async deleteImage({
    type,
    detailId,
    chapterId,
    chapterIndex,
    clone,
  }: DeleteImageProps) {
    const length = buckets.length;
    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];
      try {
        await bucket
          .file(
            `${type}/${detailId}/${chapterId}/${chapterIndex}${
              clone ? "Clone" : ""
            }.jpg`
          )
          .delete();

        return;
      } catch (e) {
        const error = e as FirebaseError;
        console.error(error.message);
      }
    }
  }
}
