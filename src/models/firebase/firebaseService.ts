import * as admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { envs } from "index";
import config from "./firebaseJson.json";

const projectIds = envs.PROJECT_ID?.split(";|;") ?? [];
// const privateKeyIds = envs.PRIVATE_KEY_ID?.split(";|;") ?? [];
const privateKeys = envs.PRIVATE_KEY?.split(";|;") ?? [];
const clientEmails = envs.CLIENT_EMAIL?.split(";|;") ?? [];
// const clientIds = envs.CLIENT_ID?.split(";|;") ?? [];
// const clientCerts = envs.CLIENT_X509_CERT_URL?.split(";|;") ?? [];
const storageBuckets = envs.STORAGE_BUCKET?.split(";|;") ?? [];

const apps = projectIds.map((_, index) => {
  return admin.initializeApp(
    {
      credential: cert({
        clientEmail: clientEmails[index],
        privateKey: privateKeys[index].replaceAll(/\\n/gm, "\n"),
        projectId: projectIds[index],
      }),
      ...config,
      projectId: projectIds[index],
      serviceAccountId: clientEmails[index],
      storageBucket: storageBuckets[index],
    },
    index.toString()
  );
});

export const buckets = apps.map((item) => getStorage(item).bucket());
