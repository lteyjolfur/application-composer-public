import path from "path";
import { describe, expect, it, vi } from "vitest";
import {
  applicationsDir,
  getApplicationDir,
  getArg,
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
  it("reads variant and tags from an application", () => {
    const target = resolveBuildTarget(["--application", "test-app"], "usage");
    expect(target).toMatchObject({
      applicationName: "test-app",
      variantName: "fullstack",
      tags: ["frontend", "backend", "fullstack"],
      outputPath: path.join(applicationsDir, "test-app", "cv.md"),
    });
  });

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

  it("builds a variant into output/ with parsed --tags", () => {
    const target = resolveBuildTarget(["--variant", "frontend", "--tags", "react, node,,"], "usage");
    expect(target).toMatchObject({
      applicationName: undefined,
      variantName: "frontend",
      tags: ["react", "node"],
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
