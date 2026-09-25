export interface Bindings {
  DB?: D1Database;
}

export type AppEnv = {
  Bindings: Bindings;
};
