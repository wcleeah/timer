import { describe, expect, test } from "bun:test";
import { DEFAULT_VAPID_SUBJECT, resolveVapidSubject } from "./vapid-subject.ts";

describe("resolveVapidSubject", () => {
  test("defaults to the live https origin", () => {
    expect(resolveVapidSubject()).toBe(DEFAULT_VAPID_SUBJECT);
    expect(resolveVapidSubject("")).toBe(DEFAULT_VAPID_SUBJECT);
  });

  test("rejects Apple-invalid localhost subjects", () => {
    expect(resolveVapidSubject("mailto:timer@localhost")).toBe(DEFAULT_VAPID_SUBJECT);
    expect(resolveVapidSubject("https://localhost")).toBe(DEFAULT_VAPID_SUBJECT);
    expect(resolveVapidSubject("http://timer.wcleeah.me")).toBe(DEFAULT_VAPID_SUBJECT);
  });

  test("keeps a real https origin or mailto", () => {
    expect(resolveVapidSubject("https://timer.wcleeah.me")).toBe("https://timer.wcleeah.me");
    expect(resolveVapidSubject("mailto:timer@wcleeah.me")).toBe("mailto:timer@wcleeah.me");
  });
});
