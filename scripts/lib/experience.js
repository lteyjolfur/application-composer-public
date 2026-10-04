// scripts/lib/experience.js
// Link bullet-bank bullets to the experience entry (job) they belong to.

export function toEntries(experience) {
  if (!experience) return [];
  return Array.isArray(experience) ? experience : [experience];
}

// Index of the entry a bullet's `job` refers to: an entry `id` first, then a
// unique `company`. A bullet without `job` belongs to the first entry.
export function resolveJobIndex(entries, job) {
  if (job === undefined || job === null) return 0;
  const byId = entries.flatMap((e, i) => (e?.id === job ? [i] : []));
  if (byId.length === 1) return byId[0];
  const byCompany = entries.flatMap((e, i) => (e?.company === job ? [i] : []));
  if (byCompany.length === 1) return byCompany[0];
  if (byCompany.length > 1) {
    throw new Error(
      `Bullet job '${job}' matches ${byCompany.length} experience entries; give each an 'id' and use that instead.`,
    );
  }
  throw new Error(`Bullet job '${job}' does not match any experience entry id or company.`);
}

// Selected bullets grouped per experience entry, keeping their selection order.
export function groupBulletsByJob(entries, bullets) {
  const groups = entries.map(() => []);
  for (const bullet of bullets) {
    groups[resolveJobIndex(entries, bullet.job)].push(bullet);
  }
  return groups;
}
