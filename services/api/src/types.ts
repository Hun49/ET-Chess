declare global {
  interface D1Database {}
}

export interface Bindings {
  DB?: D1Database;
}

export type AppEnv = {
  Bindings: Bindings;
};
