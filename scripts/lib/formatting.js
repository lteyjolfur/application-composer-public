// scripts/lib/formatting.js
// Shared formatting utilities for CV and cover letter

function formatHeader(profile) {
  let out = `# ${profile.name || ""}`.trim() + "\n\n";
  let contact = [];
  if (profile.email) {
    contact.push(`[${profile.email}](mailto:${profile.email})`);
  }
  if (profile.phone) contact.push(profile.phone);
  if (profile.location) contact.push(profile.location);
  if (profile.linkedin) {
    const url = profile.linkedin.startsWith("http")
      ? profile.linkedin
      : `https://www.linkedin.com/in/${profile.linkedin}`;
    contact.push(`[LinkedIn](${url})`);
  }
  if (profile.github) {
    const url = profile.github.startsWith("http")
      ? profile.github
      : `https://github.com/${profile.github}`;
    contact.push(`[GitHub](${url})`);
  }
  if (contact.length) out += contact.join(" | ") + "\n\n";
  return out;
}

function formatFileBase({ profile, context, type }) {
  // Name → Your_Name
  const name = (profile.name || "").trim().replace(/\s+/g, "_");

  // Context → tieto-frontend → Tieto_Frontend
  const ctx = context
    ? context
        .split(/[-_]/)
        .map((part) =>
          part ? part.charAt(0).toUpperCase() + part.slice(1) : "",
        )
        .join("_")
    : "General";

  // Type suffix
  const suffix = type === "cover" ? "Cover_Letter" : "CV";

  return `${name}_${ctx}_${suffix}`;
}

export { formatHeader, formatFileBase };
