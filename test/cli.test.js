import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  applicationsDir,
  getApplicationDir,
  getArg,
  readApplicationConfig,
  resolveBuildTarget,
  toPlainName,
} from "../scripts/lib/cli.js";
import { repoRoot } from "../scripts/lib/files.js";

describe("getArg", () => {
  it("reads --name value", () => {
    expect(getArg(["--variant", "frontend"], "variant")).toBe("frontend");
  });

  it("reads --name=value, keeping later = signs", () => {
    expect(getArg(["--tags=a=b,c"], "tags")).toBe("a=b,c");
  });

  it("returns undefined when the flag is missing or has no value", () => {
    expect(getArg(["--other", "x"], "variant")).toBeUndefined();
    expect(getArg(["--variant"], "variant")).toBeUndefined();
  });

  it("does not take the next flag as a value", () => {
    expect(getArg(["--variant", "--tags", "x"], "variant")).toBeUndefined();
  });
});

describe("toPlainName", () => {
  it("accepts a single name", () => {
    expect(toPlainName("example-role", "application name")).toBe("example-role");
  });

  it("strips trailing slashes", () => {
    expect(toPlainName("test-app/", "application name")).toBe("test-app");
  });

  it.each(["../outside", "a/b", "a\\b", ".", "..", "", "  ", "/abs"])(
    "rejects %j",
    (name) => {
      expect(() => toPlainName(name, "application name")).toThrow(
        /Invalid application name/,
      );
    },
  );
});

describe("getApplicationDir", () => {
  it("resolves an existing application folder", () => {
    expect(getApplicationDir("test-app")).toBe(path.join(applicationsDir, "test-app"));
  });

  it("rejects a missing folder", () => {
    expect(() => getApplicationDir("does-not-exist")).toThrow(/not found/);
  });

  it("rejects paths outside applications/", () => {
    expect(() => getApplicationDir("../data")).toThrow(/Invalid application name/);
  });
});

describe("resolveBuildTarget", () => {
  it("prefers the application and warns when --variant is also given", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const target = resolveBuildTarget(
      ["--application", "test-app", "--variant", "frontend"],
      "usage",
    );
    expect(target.variantName).toBe("fullstack");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("builds a variant into output/ with parsed --tags and --exclude-tags", () => {
    const target = resolveBuildTarget(
      ["--variant", "frontend", "--tags", "react, node,,", "--exclude-tags=payments"],
      "usage",
    );
    expect(target).toMatchObject({
      applicationName: undefined,
      variantName: "frontend",
      tags: ["react", "node"],
      excludeTags: ["payments"],
      outputPath: path.join(repoRoot, "output", "frontend.md"),
    });
  });

  it("throws the usage text when nothing is given", () => {
    expect(() => resolveBuildTarget([], "Usage: test")).toThrow("Usage: test");
  });

  it("rejects a variant name that is a path", () => {
    expect(() => resolveBuildTarget(["--variant", "../../x"], "usage")).toThrow(
      /Invalid variant name/,
    );
  });
});

describe("resolveBuildTarget with an application", () => {
  // A throwaway application folder; applications/* is gitignored.
  const name = `vitest-tmp-${process.pid}`;
  const dir = path.join(applicationsDir, name);
  const write = (yaml) => fs.writeFileSync(path.join(dir, "selected-tags.yaml"), yaml);

  beforeAll(() => fs.mkdirSync(dir));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("reads the application's config and writes to its cv.md", () => {
    write("variant: fullstack\ntags: [react]\nexclude_tags: [payments]\npin: [a]\n");
    expect(resolveBuildTarget(["--application", `${name}/`], "usage")).toMatchObject({
      applicationName: name,
      variantName: "fullstack",
      tags: ["react"],
      excludeTags: ["payments"],
      pin: ["a"],
      outputPath: path.join(dir, "cv.md"),
    });
  });

  it("reads company and role, defaulting to empty strings", () => {
    write("variant: fullstack\ncompany: Acme\n");
    expect(readApplicationConfig(dir)).toMatchObject({ company: "Acme", role: "" });
  });

  it("rejects exclude_tags that is not a list", () => {
    write("variant: fullstack\nexclude_tags: payments\n");
    expect(() => resolveBuildTarget(["--application", name], "usage")).toThrow(
      /'exclude_tags' in selected-tags.yaml must be an array/,
    );
  });
});
