import { describe, expect, test } from "bun:test";
import { clonePresetToRun } from "./public/js/store.js";

describe("clonePresetToRun", () => {
  const preset = {
    id: "p1",
    name: "Kitchen",
    tree: [
      {
        id: "t1",
        kind: "timer",
        name: "Boil",
        mode: "countdown",
        durationMs: 5000,
        sound: true,
        notify: false,
        children: [],
      },
    ],
  };

  test("startAll runs countdown timers with duration", () => {
    const run = clonePresetToRun(preset, { startAll: true });
    const timer = run.tree[0];
    expect(timer.status).toBe("running");
    expect(timer.endsAt).toBeGreaterThan(Date.now());
    expect(timer.sound).toBe(true);
  });

  test("plain start leaves timers idle", () => {
    const run = clonePresetToRun(preset);
    expect(run.tree[0].status).toBe("idle");
    expect(run.tree[0].remainingMs).toBe(5000);
  });
});
