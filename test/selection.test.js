import { describe, expect, it } from "vitest";
import { normalizeBullets, resolveTags, selectBullets } from "../scripts/lib/selection.js";

function bullet(id, tags, section = "experience", text = `Bullet ${id}.`) {
  return { id, text, tags, section };
}

const ids = (bullets) => bullets.map((b) => b.id);

describe("normalizeBullets", () => {
  it("accepts a top-level array", () => {
    const bullets = [bullet("a", ["frontend"])];
    expect(normalizeBullets(bullets)).toBe(bullets);
  });

  it("accepts an object with a bullets array", () => {
    const bullets = [bullet("a", ["frontend"])];
    expect(normalizeBullets({ bullets })).toBe(bullets);
  });

  it("returns null for anything else", () => {
    expect(normalizeBullets({ items: [] })).toBeNull();
    expect(normalizeBullets(null)).toBeNull();
  });
});

describe("selectBullets", () => {
  it("drops bullets with no matching tag", () => {
    const selected = selectBullets(
      [bullet("match", ["frontend"]), bullet("miss", ["backend"])],
      ["frontend"],
    );
    expect(ids(selected)).toEqual(["match"]);
  });

  it("drops bullets carrying an excluded tag, even when they match", () => {
    const selected = selectBullets(
      [bullet("keep", ["frontend"]), bullet("drop", ["frontend", "payments"])],
      ["frontend"],
      ["payments"],
    );
    expect(ids(selected)).toEqual(["keep"]);
  });

  it("ranks weighted tags above plain tags", () => {
    // backend is weighted 2; react and typescript are 1 each.
    const selected = selectBullets(
      [bullet("plain", ["react"], "experience"), bullet("weighted", ["backend"], "experience")],
      ["react", "backend"],
    );
    expect(ids(selected)).toEqual(["weighted", "plain"]);
  });

  it("keeps file order for equal scores", () => {
    const selected = selectBullets(
      [bullet("first", ["react"]), bullet("second", ["react"])],
      ["react"],
    );
    expect(ids(selected)).toEqual(["first", "second"]);
  });

  it("caps the result at 4 bullets", () => {
    const bullets = Array.from({ length: 8 }, (_, i) =>
      bullet(`b${i}`, ["react"], ["experience", "impact", "leadership"][i % 3]),
    );
    expect(selectBullets(bullets, ["react"])).toHaveLength(4);
  });

  it("fills section quotas first, then fills remaining slots by score", () => {
    const bullets = [
      bullet("exp1", ["react", "node"], "experience"),
      bullet("exp2", ["react", "node"], "experience"),
      bullet("exp3", ["react", "node"], "experience"),
      bullet("impact", ["react"], "impact"),
      bullet("lead", ["react"], "leadership"),
    ];
    // Pass 1 takes 2 experience + 1 impact + 1 leadership; exp3 never fits.
    expect(ids(selectBullets(bullets, ["react", "node"]))).toEqual([
      "exp1",
      "exp2",
      "impact",
      "lead",
    ]);
  });

  it("uses quota-free slots when a section has no candidates", () => {
    const bullets = [
      bullet("exp1", ["react"], "experience"),
      bullet("exp2", ["react"], "experience"),
      bullet("exp3", ["react"], "experience"),
    ];
    expect(ids(selectBullets(bullets, ["react"]))).toEqual(["exp1", "exp2", "exp3"]);
  });

  it("treats a missing section as experience", () => {
    const [selected] = selectBullets([{ id: "a", text: "A.", tags: ["react"] }], ["react"]);
    expect(selected.section).toBe("experience");
  });

  describe("duplicate detection", () => {
    it("skips a bullet whose text is contained in an already-selected one", () => {
      const selected = selectBullets(
        [
          bullet("long", ["react", "node"], "experience", "Rebuilt the tracking UI in React, cutting load time by 60%.\n"),
          bullet("short", ["react"], "experience", "Rebuilt the tracking UI in React.\n"),
        ],
        ["react", "node"],
      );
      expect(ids(selected)).toEqual(["long"]);
    });

    it("ignores case, punctuation, and whitespace differences", () => {
      const selected = selectBullets(
        [
          bullet("a", ["react"], "experience", "Shipped the new  checkout!"),
          bullet("b", ["react"], "experience", "shipped the new checkout"),
        ],
        ["react"],
      );
      expect(ids(selected)).toEqual(["a"]);
    });

    it("keeps non-ASCII letters when comparing", () => {
      const selected = selectBullets(
        [
          bullet("a", ["react"], "experience", "Förbättrade laddtiden med 60 %."),
          bullet("b", ["react"], "experience", "Förbättrade laddtiden"),
        ],
        ["react"],
      );
      expect(ids(selected)).toEqual(["a"]);
    });

    it("does not catch reworded bullets", () => {
      const selected = selectBullets(
        [
          bullet("a", ["react"], "experience", "Cut page load time by 60%."),
          bullet("b", ["react"], "experience", "Reduced page load by 60%."),
        ],
        ["react"],
      );
      expect(ids(selected)).toEqual(["a", "b"]);
    });
  });
});

describe("resolveTags", () => {
  const variant = { include_tags: ["backend", "payments"], exclude_tags: ["legacy"] };

  it("adds extra tags to the variant's include tags", () => {
    expect(resolveTags(variant, { tags: ["react", "backend"] })).toEqual({
      include: ["backend", "payments", "react"],
      exclude: ["legacy"],
    });
  });

  it("combines variant and extra exclude tags", () => {
    expect(resolveTags(variant, { excludeTags: ["payments"] }).exclude).toEqual([
      "legacy",
      "payments",
    ]);
  });

  it("removes excluded tags from the include list", () => {
    expect(resolveTags(variant, { excludeTags: ["payments"] }).include).toEqual(["backend"]);
  });

  it("works with no extra tags and a variant without exclude_tags", () => {
    expect(resolveTags({ include_tags: ["react"] })).toEqual({ include: ["react"], exclude: [] });
  });

  it("drops a variant bullet when the application excludes one of its tags", () => {
    const bullets = [
      bullet("pay", ["backend", "payments"], "experience"),
      bullet("api", ["backend"], "experience"),
    ];
    const { include, exclude } = resolveTags(variant, { excludeTags: ["payments"] });
    expect(ids(selectBullets(bullets, include, exclude))).toEqual(["api"]);
  });
});
