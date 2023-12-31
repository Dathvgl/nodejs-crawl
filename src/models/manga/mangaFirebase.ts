import { FirebaseError } from "firebase-admin";
import { getDownloadURL } from "firebase-admin/storage";
import { buckets } from "models/firebase/firebaseService";
import { MangaType } from "types/manga";

export default class MangaFirebase {
  static async addThumnail(
    buffer: Buffer | undefined,
    id: string,
    type: MangaType
  ) {
    if (!buffer) return "";
    const length = buckets.length;
    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];
      try {
        const file = bucket.file(`${type}/${id}/thumbnail.jpg`);
        await file.save(buffer, { contentType: "image/jpeg" });
        return await getDownloadURL(file);
      } catch (e) {
        const error = e as FirebaseError
        console.error(error.message);
      }
    }

    return "";
  }

  static async deleteThumnail(id: string, type: MangaType) {
    const length = buckets.length;
    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];
      try {
        await bucket.file(`${type}/${id}/thumbnail.jpg`).delete();
        return;
      } catch (e) {
        const error = e as FirebaseError
        console.error(error.message);
      }
    }
  }

  static async addImage(
    buffer: Buffer | undefined,
    detailId: string,
    chapterId: string,
    chapterIndex: number,
    type: MangaType
  ) {
    if (!buffer) return "";
    const length = buckets.length;
    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];
      try {
        const file = bucket.file(
          `${type}/${detailId}/${chapterId}/${chapterIndex}.jpg`
        );

        await file.save(buffer, { contentType: "image/jpeg" });
        return await getDownloadURL(file);
      } catch (e) {
        const error = e as FirebaseError
        console.error(error.message);
      }
    }

    return "";
  }

  static async deleteImage(
    detailId: string,
    chapterId: string,
    chapterIndex: number,
    type: MangaType
  ) {
    const length = buckets.length;
    for (let index = 0; index < length; index++) {
      const bucket = buckets[index];
      try {
        await bucket
          .file(`${type}/${detailId}/${chapterId}/${chapterIndex}.jpg`)
          .delete();
        return;
      } catch (e) {
        const error = e as FirebaseError
        console.error(error.message);
      }
    }
  }
}
