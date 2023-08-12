declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: string;
      MONGO_URL?: string;
      MONGO_DB?: string;
      PUPPETEER_EXECUTABLE_PATH?: string;
      PUPPETEER_QUALITY?: string;
      LIMIT_LIST?: string;
      BLOGTRUYEN?: string;
      NETTRUYEN?: string;
      PROJECT_ID?: string;
      PRIVATE_KEY_ID?: string;
      PRIVATE_KEY?: string;
      CLIENT_EMAIL?: string;
      CLIENT_ID?: string;
      CLIENT_X509_CERT_URL?: string;
      STORAGE_BUCKET?: string;
    }
  }
}

export {};
