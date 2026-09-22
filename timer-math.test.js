import { describe, expect, test } from "bun:test";
import {
  combineDuration,
  displayMs,
  formatDuration,
  hasHitZero,
  splitDuration,
} from "./public/js/timer-math.js";

describe("timer-math", () => {
  test("formats minutes and hours", () => {
    expect(formatDuration(5_000)).toBe("00:05");
    expect(formatDuration(3_600_000)).toBe("1:00:00");
  });

  test("round-trips duration parts", () => {
    const ms = combineDuration({ hours: 1, minutes: 2, seconds: 3 });
    expect(splitDuration(ms)).toEqual({ hours: 1, minutes: 2, seconds: 3 });
  });

  test("countdown uses endsAt while running", () => {
    const now = 1_000_000;
    const node = {
      kind: "timer",
      mode: "countdown",
      status: "running",
      remainingMs: 60_000,
      durationMs: 60_000,
      endsAt: now + 12_000,
    };
    expect(displayMs(node, now)).toBe(12_000);
    expect(hasHitZero(node, now + 12_000)).toBe(true);
  });
});
