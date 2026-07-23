import { changelogReleasesRepository } from '@/data-layer/repositories/changelogReleasesRepository.js';
import { changelogEntriesRepository } from '@/data-layer/repositories/changelogEntriesRepository.js';
import { uid, nowISO } from '@/utils/id.js';

const RELEASE_TYPES = ['major', 'minor', 'patch', 'hotfix', 'beta', 'alpha'];
const CATEGORIES = [
  'New Feature', 'Enhancement', 'Improvement', 'Bug Fix', 'Security', 'Performance',
  'UI/UX', 'Database', 'API', 'Authentication', 'Authorization', 'Notifications',
  'Storage', 'Setup Wizard', 'Installer', 'Migration', 'Documentation', 'Refactoring',
  'Testing', 'Breaking Change', 'Deprecated', 'Removed',
];
const STATUSES = ['planned', 'in_progress', 'completed', 'released', 'deprecated', 'rolled_back'];
const ENVIRONMENTS = ['development', 'staging', 'production', 'testing'];

export const changelogService = {
  RELEASE_TYPES,
  CATEGORIES,
  STATUSES,
  ENVIRONMENTS,

  // ── Releases ──
  async listReleases(query = {}) {
    const releases = await changelogReleasesRepository.getAll(query);
    const sorted = (releases || []).sort((a, b) => {
      const da = a.release_date || a.created_at || '';
      const db = b.release_date || b.created_at || '';
      return db.localeCompare(da);
    });
    const enriched = await Promise.all(sorted.map(r => this._enrichRelease(r)));
    return enriched;
  },

  async getRelease(id) {
    const release = await changelogReleasesRepository.getById(id);
    if (!release) return null;
    return this._enrichRelease(release);
  },

  async getReleaseByVersion(version) {
    const releases = await changelogReleasesRepository.getAll({ version });
    if (!releases || releases.length === 0) return null;
    return this._enrichRelease(releases[0]);
  },

  async createRelease(data) {
    const now = nowISO();
    const release = await changelogReleasesRepository.create({
      id: uid('clr'),
      ...data,
      created_at: now,
      updated_at: now,
    });
    return this._enrichRelease(release);
  },

  async updateRelease(id, data) {
    const release = await changelogReleasesRepository.update(id, {
      ...data,
      updated_at: nowISO(),
    });
    return this._enrichRelease(release);
  },

  async deleteRelease(id) {
    const entries = await changelogEntriesRepository.getAll({ release_id: id });
    if (entries && entries.length > 0) {
      await Promise.all(entries.map(e => changelogEntriesRepository.delete(e.id)));
    }
    return changelogReleasesRepository.delete(id);
  },

  // ── Entries ──
  async listEntries(releaseId) {
    const entries = await changelogEntriesRepository.getAll({ release_id: releaseId });
    return (entries || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },

  async createEntry(data) {
    return changelogEntriesRepository.create({
      id: uid('cle'),
      ...data,
      created_at: nowISO(),
    });
  },

  async updateEntry(id, data) {
    return changelogEntriesRepository.update(id, data);
  },

  async deleteEntry(id) {
    return changelogEntriesRepository.delete(id);
  },

  async bulkCreateEntries(releaseId, entries) {
    const sorted = entries.map((e, i) => ({
      id: uid('cle'),
      release_id: releaseId,
      sort_order: i,
      ...e,
      created_at: nowISO(),
    }));
    return changelogEntriesRepository.bulkCreate(sorted);
  },

  // ── Filtering / Search ──
  async searchReleases({ query, releaseType, category, status, author, environment, dateFrom, dateTo }) {
    let releases = await changelogReleasesRepository.getAll({});
    let filtered = (releases || []);

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(r =>
        (r.version && r.version.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.author && r.author.toLowerCase().includes(q))
      );
    }
    if (releaseType) filtered = filtered.filter(r => r.release_type === releaseType);
    if (status) filtered = filtered.filter(r => r.status === status);
    if (author) filtered = filtered.filter(r => r.author && r.author.toLowerCase().includes(author.toLowerCase()));
    if (environment) filtered = filtered.filter(r => r.environment === environment);
    if (dateFrom) filtered = filtered.filter(r => r.release_date && r.release_date >= dateFrom);
    if (dateTo) filtered = filtered.filter(r => r.release_date && r.release_date <= dateTo);

    filtered.sort((a, b) => {
      const da = a.release_date || a.created_at || '';
      const db = b.release_date || b.created_at || '';
      return db.localeCompare(da);
    });

    return Promise.all(filtered.map(r => this._enrichRelease(r)));
  },

  async searchEntries(query, category, type) {
    const entries = await changelogEntriesRepository.getAll({});
    let filtered = (entries || []);
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(e =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.author && e.author.toLowerCase().includes(q)) ||
        (e.related_issue && e.related_issue.toLowerCase().includes(q))
      );
    }
    if (category) filtered = filtered.filter(e => e.category === category);
    if (type) filtered = filtered.filter(e => e.type === type);
    return filtered;
  },

  // ── Statistics ──
  async getStats() {
    const releases = await changelogReleasesRepository.getAll({});
    const all = releases || [];

    const stats = {
      totalReleases: all.length,
      latestVersion: null,
      majorReleases: 0,
      minorReleases: 0,
      patchReleases: 0,
      hotfixes: 0,
      totalFeatures: 0,
      totalBugFixes: 0,
      totalImprovements: 0,
      totalBreakingChanges: 0,
    };

    let latest = null;
    for (const r of all) {
      if (r.release_type === 'major') stats.majorReleases++;
      if (r.release_type === 'minor') stats.minorReleases++;
      if (r.release_type === 'patch') stats.patchReleases++;
      if (r.release_type === 'hotfix') stats.hotfixes++;

      if (!latest || (r.release_date || '') > (latest.release_date || '')) {
        latest = r;
      }
    }
    stats.latestVersion = latest?.version || null;

    const entries = await changelogEntriesRepository.getAll({});
    const entryList = entries || [];
    for (const e of entryList) {
      if (e.type === 'New Feature' || e.category === 'New Feature') stats.totalFeatures++;
      if (e.type === 'Bug Fix' || e.category === 'Bug Fix') stats.totalBugFixes++;
      if (e.type === 'Improvement' || e.category === 'Improvement' || e.type === 'Enhancement') stats.totalImprovements++;
      if (e.type === 'Breaking Change' || e.category === 'Breaking Change') stats.totalBreakingChanges++;
    }

    return stats;
  },

  // ── Version Comparison ──
  async compareVersions(versionA, versionB) {
    const releaseA = await this.getReleaseByVersion(versionA);
    const releaseB = await this.getReleaseByVersion(versionB);
    if (!releaseA || !releaseB) return null;

    const entriesA = releaseA.entries || [];
    const entriesB = releaseB.entries || [];

    const mapEntries = (entries) => {
      const map = {};
      for (const e of entries) {
        const key = e.title.toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(e);
      }
      return map;
    };

    const mapA = mapEntries(entriesA);
    const mapB = mapEntries(entriesB);

    const added = entriesB.filter(e => !mapA[e.title.toLowerCase()]);
    const removed = entriesA.filter(e => !mapB[e.title.toLowerCase()]);
    const modified = entriesB.filter(e => {
      const existing = mapA[e.title.toLowerCase()];
      return existing && existing.some(x => x.description !== e.description);
    });
    const fixed = entriesB.filter(e => e.type === 'Bug Fix' && !mapA[e.title.toLowerCase()]);
    const breaking = entriesB.filter(e =>
      (e.type === 'Breaking Change' || e.category === 'Breaking Change')
    );

    return { versionA, versionB, added, removed, modified, fixed, breaking };
  },

  // ── Export ──
  async exportData(format = 'json') {
    const releases = await this.listReleases({});
    const data = releases.map(r => ({
      version: r.version,
      releaseDate: r.release_date,
      releaseTime: r.release_time,
      timezone: r.timezone,
      buildNumber: r.build_number,
      releaseType: r.release_type,
      title: r.title,
      description: r.description,
      summary: r.summary,
      status: r.status,
      author: r.author,
      environment: r.environment,
      relatedIssue: r.related_issue,
      entries: r.entries.map(e => ({
        type: e.type,
        category: e.category,
        title: e.title,
        description: e.description,
        author: e.author,
        relatedIssue: e.related_issue,
      })),
    }));

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv': {
        const rows = ['version,releaseDate,releaseType,status,author,category,type,title,description'];
        for (const r of data) {
          for (const e of r.entries) {
            rows.push([
              r.version, r.releaseDate, r.releaseType, r.status, r.author,
              e.category, e.type,
              `"${(e.title || '').replace(/"/g, '""')}"`,
              `"${(e.description || '').replace(/"/g, '""')}"`,
            ].join(','));
          }
          if (r.entries.length === 0) {
            rows.push([r.version, r.releaseDate, r.releaseType, r.status, r.author, '', '', '', ''].join(','));
          }
        }
        return rows.join('\n');
      }

      case 'markdown': {
        let md = `# Changelog\n\n`;
        for (const r of data) {
          md += `## ${r.version} — ${r.releaseDate || 'N/A'}\n\n`;
          md += `**Release Type:** ${r.releaseType}  \n`;
          md += `**Status:** ${r.status}  \n`;
          md += `**Author:** ${r.author}  \n`;
          if (r.description) md += `\n${r.description}\n\n`;
          if (r.entries.length > 0) {
            const groups = {};
            for (const e of r.entries) {
              const cat = e.category || 'Other';
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(e.title);
            }
            for (const [cat, items] of Object.entries(groups)) {
              md += `### ${cat}\n\n`;
              for (const item of items) md += `- ${item}\n`;
              md += '\n';
            }
          }
        }
        return md;
      }

      default:
        return JSON.stringify(data, null, 2);
    }
  },

  downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadExport(format) {
    const content = await this.exportData(format);
    const mimeTypes = { json: 'application/json', csv: 'text/csv', markdown: 'text/markdown' };
    this.downloadBlob(content, `changelog.${format}`, mimeTypes[format] || 'text/plain');
  },

  // ── Helpers ──
  async _enrichRelease(release) {
    if (!release) return null;
    const entries = await this.listEntries(release.id);
    return { ...release, entries };
  },

  getLatestVersion(releases) {
    if (!releases || releases.length === 0) return null;
    const sorted = [...releases].sort((a, b) => {
      return this._compareSemver(b.version, a.version);
    });
    return sorted[0]?.version || null;
  },

  _compareSemver(a, b) {
    const pa = (a || '').replace(/^v/i, '').split(/[.-]/);
    const pb = (b || '').replace(/^v/i, '').split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = parseInt(pa[i], 10) || 0;
      const nb = parseInt(pb[i], 10) || 0;
      if (na !== nb) return na - nb;
    }
    return 0;
  },
};

export default changelogService;
