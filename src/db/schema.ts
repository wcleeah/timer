import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const presets = pgTable("presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const presetNodes = pgTable("preset_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  presetId: uuid("preset_id")
    .notNull()
    .references(() => presets.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  kind: text("kind").notNull(), // group | timer
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  mode: text("mode"), // countdown | stopwatch | recurring
  durationMs: integer("duration_ms"),
  note: text("note").notNull().default(""),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  presetId: uuid("preset_id").references(() => presets.id, {
    onDelete: "set null",
  }),
  presetName: text("preset_name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const runNodes = pgTable("run_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  mode: text("mode"),
  durationMs: integer("duration_ms"),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("idle"), // idle | running | paused | completed
  remainingMs: integer("remaining_ms"),
  elapsedMs: integer("elapsed_ms").notNull().default(0),
  cycleCount: integer("cycle_count").notNull().default(0),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  runningSince: timestamp("running_since", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Preset = typeof presets.$inferSelect;
export type PresetNode = typeof presetNodes.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunNode = typeof runNodes.$inferSelect;
