import { describe, expect, it } from "vitest";
import { fillPlaceholders, formatFileBase, formatHeader } from "../scripts/lib/formatting.js";
import {
  formatEducation,
  formatExperience,
  formatLanguages,
  formatSkills,
  getCoverTemplateName,
} from "../scripts/assemble.js";

describe("formatHeader", () => {
  it("links email, LinkedIn handle, and GitHub handle", () => {
    const header = formatHeader({
      name: "Jordan Example",
      email: "jordan@example.com",
      phone: "+46 70 000 00 00",
      linkedin: "jordan-example",
      github: "https://github.com/jordan-example",
    });
    expect(header).toBe(
      "# Jordan Example\n\n" +
        "[jordan@example.com](mailto:jordan@example.com) | +46 70 000 00 00 | " +
        "[LinkedIn](https://www.linkedin.com/in/jordan-example) | " +
        "[GitHub](https://github.com/jordan-example)\n\n",
    );
  });
});

describe("formatFileBase", () => {
  it("builds Name_Context_Type", () => {
    const profile = { name: "Jordan Example" };
    expect(formatFileBase({ profile, context: "acme-frontend", type: "cv" })).toBe(
      "Jordan_Example_Acme_Frontend_CV",
    );
    expect(formatFileBase({ profile, context: "acme", type: "cover" })).toBe(
      "Jordan_Example_Acme_Cover_Letter",
    );
  });
});

describe("formatExperience", () => {
  const experience = [
    { role: "Senior Dev", company: "Acme", start: 2021, end: "Present", bullets: ["Ignored static."] },
    { role: "Dev", company: "Globex", start: 2017, end: 2021, bullets: ["Static older bullet."] },
  ];

  it("puts selected bullets under the first entry only", () => {
    const out = formatExperience(experience, [{ text: "Selected bullet.\n" }]);
    const [first, second] = out.split('<div class="job">').slice(1);
    expect(first).toContain("- Selected bullet.");
    expect(second).not.toContain("Selected bullet.");
  });

  it("uses static bullets for older entries and ignores them on the first", () => {
    const out = formatExperience(experience, []);
    expect(out).toContain("- Static older bullet.");
    expect(out).not.toContain("Ignored static.");
  });

  it("formats the date range and location", () => {
    const out = formatExperience([{ role: "Dev", company: "Acme", start: 2020, end: 2022, location: "Remote" }], []);
    expect(out).toContain("### Dev, Acme\n2020–2022 · Remote\n");
  });
});

describe("formatSkills", () => {
  it("renders groups and skips empty ones", () => {
    const out = formatSkills({ groups: { Frontend: ["React", " TypeScript "], Empty: [] } });
    expect(out).toBe("## Skills\n\n### Frontend\nReact, TypeScript\n\n");
  });

  it("renders a flat skills list", () => {
    expect(formatSkills({ skills: ["Go", "SQL"] })).toBe("## Skills\n\nGo, SQL\n\n");
  });
});

describe("formatEducation", () => {
  it("joins school, years, and location", () => {
    const out = formatEducation({
      education: [{ degree: "BSc", school: "Example University", start: 2013, end: 2016, location: "Lund" }],
    });
    expect(out).toContain("### BSc\nExample University · 2013-2016 · Lund\n");
  });
});

describe("formatLanguages", () => {
  it("puts each language on its own line with Markdown hard breaks", () => {
    const out = formatLanguages([
      { language: "English", level: "Fluent" },
      { language: "Swedish", level: "Professional" },
    ]);
    expect(out).toBe("## Languages\n\nEnglish: Fluent  \nSwedish: Professional\n\n");
  });

  it("returns nothing for an empty list", () => {
    expect(formatLanguages([])).toBe("");
  });
});

describe("getCoverTemplateName", () => {
  it.each([
    ["testautomation", [], "test-automation"],
    ["leadership", [], "leadership"],
    ["fullstack", [], "fullstack"],
    ["frontend", [], "frontend"],
    ["custom", ["tech-lead"], "leadership"],
    ["custom", ["react"], "base"],
  ])("variant %s with tags %j picks %s", (variant, tags, expected) => {
    expect(getCoverTemplateName(variant, tags)).toBe(expected);
  });
});

describe("fillPlaceholders", () => {
  it("replaces placeholders that have a value", () => {
    expect(fillPlaceholders("<ROLE> at <COMPANY>", { ROLE: "Developer", COMPANY: "Acme" })).toBe(
      "Developer at Acme",
    );
  });

  it("leaves placeholders without a value visible", () => {
    expect(
      fillPlaceholders("<ROLE> at <COMPANY> because <COMPANY_MOTIVATION>", { COMPANY: "Acme", ROLE: " " }),
    ).toBe("<ROLE> at Acme because <COMPANY_MOTIVATION>");
  });

  it("does not touch HTML tags or lowercase angle brackets", () => {
    expect(fillPlaceholders('<div class="job"> <name>', { NAME: "x" })).toBe('<div class="job"> <name>');
  });
});
