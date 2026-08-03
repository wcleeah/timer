import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __timerDb?: Db;
  __timerSql?: ReturnType<typeof postgres>;
};

function getDb(): Db {
  if (globalForDb.__timerDb) return globalForDb.__timerDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString, { prepare: false });
  const instance = drizzle(client, { schema });
  globalForDb.__timerSql = client;
  globalForDb.__timerDb = instance;
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
