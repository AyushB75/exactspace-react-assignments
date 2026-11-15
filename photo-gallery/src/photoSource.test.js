// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { photoPageUrl } from "./photoSource";

afterEach(() => vi.unstubAllEnvs());
describe("Photo sources", () => {
  it("defaults to the original Picsum API and preserves pagination", () => {
    vi.stubEnv("VITE_PHOTO_SOURCE", undefined);
    expect(photoPageUrl(1)).toBe("https://picsum.photos/v2/list?page=1");
    expect(photoPageUrl(42)).toBe("https://picsum.photos/v2/list?page=42");
  });
  it("serves three complete mock pages with unique IDs and existing local images, then an empty page", () => {
    vi.stubEnv("VITE_PHOTO_SOURCE", "mock");
    const ids = new Set();
    for (const page of [1, 2, 3]) {
      const data = JSON.parse(
        readFileSync(
          new URL(`../public${photoPageUrl(page)}`, import.meta.url),
          "utf8",
        ),
      );
      expect(data).toHaveLength(6);
      for (const photo of data) {
        expect(Object.keys(photo).sort()).toEqual([
          "author",
          "download_url",
          "id",
        ]);
        expect(
          Object.values(photo).every(
            (value) => typeof value === "string" && value.length > 0,
          ),
        ).toBe(true);
        expect(ids.has(photo.id)).toBe(false);
        ids.add(photo.id);
        expect(photo.download_url).toMatch(/^\/mock\/images\//);
        expect(
          existsSync(
            new URL(`../public${photo.download_url}`, import.meta.url),
          ),
        ).toBe(true);
      }
    }
    expect(ids.size).toBe(18);
    expect(
      JSON.parse(
        readFileSync(
          new URL(`../public${photoPageUrl(4)}`, import.meta.url),
          "utf8",
        ),
      ),
    ).toEqual([]);
    expect(photoPageUrl(99)).toBe(photoPageUrl(4));
  });
  it("rejects misspelled modes instead of silently changing the data source", () => {
    vi.stubEnv("VITE_PHOTO_SOURCE", "mocks");
    expect(() => photoPageUrl(1)).toThrow("Invalid VITE_PHOTO_SOURCE");
  });
});
