import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { judgmentsRepository } from '@/data-layer/repositories/judgmentsRepository.js';
import { courtsRepository } from '@/data-layer/repositories/courtsRepository.js';
import { benchTypesRepository } from '@/data-layer/repositories/benchTypesRepository.js';
import { judgesRepository } from '@/data-layer/repositories/judgesRepository.js';
import { actsRepository } from '@/data-layer/repositories/actsRepository.js';
import { caseTypesRepository } from '@/data-layer/repositories/caseTypesRepository.js';
import { caseStagesRepository } from '@/data-layer/repositories/caseStagesRepository.js';
import { areaOfLawRepository } from '@/data-layer/repositories/areaOfLawRepository.js';
import { typeOfProceedingRepository } from '@/data-layer/repositories/typeOfProceedingRepository.js';
import { natureOfDisputeRepository } from '@/data-layer/repositories/natureOfDisputeRepository.js';
import { provisionsRepository } from '@/data-layer/repositories/provisionsRepository.js';
import { auditLogsRepository } from '@/data-layer/repositories/auditLogsRepository.js';
import { useFormat } from '@/utils/format.js';
import AddJudgmentModal from './AddJudgmentModal.jsx';
import ConfirmDialog from '@/components/setup/wizard/ConfirmDialog.jsx';

const TABLE_HEADERS = [
  { key: 'caseNumber', label: 'Case Number' },
  { key: 'title', label: 'Case Title' },
  { key: 'citation', label: 'Citation', sortable: true },
  { key: 'court', label: 'Court / Bench' },
  { key: 'applicability', label: 'Applicability' },
  { key: 'date', label: 'Judgment Date', sortable: true },
  { key: 'updated', label: 'Last Updated' },
  { key: 'actions', label: 'Actions' },
];

const FILTER_DEFAULTS = {
  court: '',
  bench: '',
  type: '',
  typeOfProceeding: '',
  natureOfDispute: '',
  act: '',
  provision: '',
  applicableStage: '',
  year: '',
};

export default function JudgmentLibrary() {
  const navigate = useNavigate();
  const { formatDate } = useFormat();
  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [favourites, setFavourites] = useState({});
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);
  const [showFilters, setShowFilters] = useState(true);
  const fileInputRef = useRef(null);

  const [courts, setCourts] = useState([]);
  const [benchTypes, setBenchTypes] = useState([]);
  const [judges, setJudges] = useState([]);
  const [acts, setActs] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [caseStages, setCaseStages] = useState([]);
  const [areaOfLaws, setAreaOfLaws] = useState([]);
  const [typeOfProceedings, setTypeOfProceedings] = useState([]);
  const [natureOfDisputes, setNatureOfDisputes] = useState([]);
  const [provisions, setProvisions] = useState([]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const loadJudgments = useCallback(() => {
    setLoading(true);
    judgmentsRepository.getAll()
      .then((data) => setJudgments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJudgments();
    courtsRepository.getAll().then(setCourts).catch(() => {});
    benchTypesRepository.getAll().then(setBenchTypes).catch(() => {});
    judgesRepository.getAll().then(setJudges).catch(() => {});
    actsRepository.getAll().then(setActs).catch(() => {});
    caseTypesRepository.getAll().then(setCaseTypes).catch(() => {});
    caseStagesRepository.getAll().then(setCaseStages).catch(() => {});
    areaOfLawRepository.getAll().then(setAreaOfLaws).catch(() => {});
    typeOfProceedingRepository.getAll().then(setTypeOfProceedings).catch(() => {});
    natureOfDisputeRepository.getAll().then(setNatureOfDisputes).catch(() => {});
    provisionsRepository.getAll().then(setProvisions).catch(() => {});
  }, [loadJudgments]);

  const [editing, setEditing] = useState(null);

  const handleDelete = (j) => {
    setDeleteTarget(j);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const delId = deleteTarget.id;
    const label = deleteTarget.title || deleteTarget.citation || 'Untitled';
    setDeleteTarget(null);
    judgmentsRepository.delete(delId)
      .then((ok) => {
        if (!ok) {
          console.error('[JudgmentLibrary] delete returned no rows for id', delId);
          return;
        }
        auditLogsRepository.create({
          action: 'delete',
          module: 'judgments',
          user_name: 'current user',
          details: `Deleted judgment: ${label}`,
          at: new Date().toISOString(),
        }).catch(() => {});
        loadJudgments();
      })
      .catch((e) => {
        console.error('[JudgmentLibrary] delete failed:', e);
      });
  };

  const handleDuplicate = (j) => {
    const { id, createdAt, updatedAt, ...rest } = j;
    judgmentsRepository.create({
      ...rest,
      title: rest.title ? `${rest.title} (Copy)` : rest.title,
      citation: rest.citation ? `${rest.citation} (Copy)` : rest.citation,
      status: 'Draft',
    })
      .then(() => loadJudgments())
      .catch(() => {});
  };

  const nameMap = useMemo(() => {
    const build = (arr, field = 'name') => {
      const m = {};
      (arr || []).forEach((r) => { m[r.id] = r[field] || r.name || r.title || r.short_code || r.id; });
      return m;
    };
    return {
      court: build(courts),
      bench: build(benchTypes),
      judge: build(judges),
      act: build(acts, 'title'),
      caseType: build(caseTypes),
      stage: build(caseStages),
      areaOfLaw: build(areaOfLaws),
      typeOfProceeding: build(typeOfProceedings),
      natureOfDispute: build(natureOfDisputes),
      provision: build(provisions),
    };
  }, [courts, benchTypes, judges, acts, caseTypes, caseStages, areaOfLaws, typeOfProceedings, natureOfDisputes, provisions]);

  const resolveName = (map, val) => (val ? (map[val] || val) : 'â€”');

  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.flat();
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch {}
      return [v];
    }
    return [];
  };

    const uniqueValues = useMemo(() => {
    const courts = new Set();
    const judges = new Set();
    const types = new Set();
    const years = new Set();
    const matterTypes = new Set();
    const actIds = new Set();
    const benches = new Set();
    const typeOfProceedings = new Set();
    const natureOfDisputes = new Set();
    const provisions = new Set();
    const applicableStages = new Set();
    judgments.forEach((j) => {
      if (j.court) courts.add(j.court);
      if (j.judges || j.judge || j.bench) judges.add(j.judges || j.judge || j.bench);
      if (j.caseType) types.add(j.caseType);
      if (j.subjectMatter) matterTypes.add(j.subjectMatter);
      if (j.act) actIds.add(j.act);
      if (j.acts?.length) j.acts.forEach((id) => actIds.add(id));
      if (j.bench) benches.add(j.bench);
      if (j.typeOfProceeding) typeOfProceedings.add(j.typeOfProceeding);
      if (j.natureOfDispute) natureOfDisputes.add(j.natureOfDispute);
      if (j.provisions?.length) toArr(j.provisions).forEach((p) => p && provisions.add(p));
      if (j.applicableStages?.length) toArr(j.applicableStages).forEach((s) => s && applicableStages.add(s));
      if (j.date) {
        try { years.add(new Date(j.date).getFullYear()); } catch {}
      }
    });
    const labelOrUnknown = (map, id) => (id && map[id] ? map[id] : (id ? 'Unknown' : '—'));
    return {
      courts: Array.from(courts).sort().map((id) => ({ value: id, label: nameMap.court[id] || id })),
      judges: Array.from(judges).sort().map((id) => ({ value: id, label: nameMap.judge[id] || id })),
      types: Array.from(types).sort().map((id) => ({ value: id, label: nameMap.caseType[id] || 'Unknown' })),
      matterTypes: Array.from(matterTypes).sort().map((v) => ({ value: v, label: v })),
      acts: Array.from(actIds).sort().map((id) => ({ value: id, label: nameMap.act[id] || 'Unknown' })),
      years: Array.from(years).sort(),
      benches: Array.from(benches).sort().map((id) => ({ value: id, label: nameMap.bench[id] || id })),
      typeOfProceedings: Array.from(typeOfProceedings).sort().map((id) => ({ value: id, label: labelOrUnknown(nameMap.typeOfProceeding, id) })),
      natureOfDisputes: Array.from(natureOfDisputes).sort().map((id) => ({ value: id, label: labelOrUnknown(nameMap.natureOfDispute, id) })),
      provisions: Array.from(provisions).sort().map((id) => ({ value: id, label: labelOrUnknown(nameMap.provision, id) })),
      applicableStages: Array.from(applicableStages).sort().map((id) => ({ value: id, label: labelOrUnknown(nameMap.stage, id) })),
    };
  }, [judgments, nameMap]);

  const stats = useMemo(() => {
    const list = judgments;
    const total = list.length;
    const active = list.filter((j) => !j.archived).length;
    const archived = list.filter((j) => j.archived).length;
    const favourite = list.filter((j) => j.favourite || j.favorited).length;
    const recentlyAdded = list.filter((j) => {
      if (!j.createdAt && !j.date) return false;
      return Date.now() - new Date(j.createdAt || j.date) < 30 * 24 * 60 * 60 * 1000;
    }).length;
    const supreme = list.filter((j) => (nameMap.court[j.court] || '').toLowerCase().includes('supreme')).length;
    const highCourt = list.filter((j) => (nameMap.court[j.court] || '').toLowerCase().includes('high')).length;
    const tribunal = list.filter((j) => (nameMap.court[j.court] || '').toLowerCase().includes('tribunal')).length;
    return { total, active, archived, favourite, recentlyAdded, recentlyViewed: 89, supreme, highCourt, tribunal };
  }, [judgments]);

  const filtered = useMemo(() => {
    let rows = [...judgments];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((j) =>
        (j.caseName || j.title || '').toLowerCase().includes(q) ||
        (j.citation || '').toLowerCase().includes(q) ||
        (j.caseNumber || '').toLowerCase().includes(q) ||
        (j.court || '').toLowerCase().includes(q) ||
        (j.judge || j.bench || '').toLowerCase().includes(q) ||
        (j.keywords || []).join(' ').toLowerCase().includes(q)
      );
    }
    if (filters.court) rows = rows.filter((j) => (j.court || '') === filters.court);
    if (filters.bench) rows = rows.filter((j) => (j.bench || '') === filters.bench);
    if (filters.judge) rows = rows.filter((j) => (j.judge || j.bench || '') === filters.judge);
    if (filters.type) rows = rows.filter((j) => (j.caseType || '') === filters.type);
    if (filters.typeOfProceeding) rows = rows.filter((j) => (j.typeOfProceeding || '') === filters.typeOfProceeding);
    if (filters.natureOfDispute) rows = rows.filter((j) => (j.natureOfDispute || '') === filters.natureOfDispute);
    if (filters.matterType) rows = rows.filter((j) => (j.subjectMatter || '') === filters.matterType);
    if (filters.act) rows = rows.filter((j) => (j.act || '') === filters.act || (j.acts || []).includes(filters.act));
    if (filters.provision) rows = rows.filter((j) => (j.provisions || []).some((p) => p === filters.provision));
    if (filters.applicableStage) rows = rows.filter((j) => (j.applicableStages || []).some((s) => s === filters.applicableStage));
    if (filters.year) {
      rows = rows.filter((j) => {
        try { return new Date(j.date).getFullYear() === Number(filters.year); } catch { return false; }
      });
    }
    rows.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return rows;
  }, [judgments, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const allSelected = paged.length > 0 && paged.every((j) => selected.includes(j.id));
  const toggleAll = () => setSelected(allSelected ? [] : paged.map((j) => j.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleFavourite = (id) => setFavourites((prev) => ({ ...prev, [id]: !prev[id] }));

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setPage(1);
  };

  const exportCsv = useCallback(() => {
    const headers = ['caseName', 'title', 'citation', 'court', 'bench', 'judges', 'date', 'caseNumber', 'status', 'subjectMatter'];
    const labelMap = {
      caseName: 'Case Name', title: 'Title', citation: 'Citation', court: 'Court',
      bench: 'Bench', judges: 'Judges', date: 'Judgment Date', caseNumber: 'Case Number',
      status: 'Status', subjectMatter: 'Subject Matter',
    };
    const rows = filtered.map((j) => ({
      ...j,
      status: j.archived ? 'Archived' : 'Active',
      court: resolveName(nameMap.court, j.court),
      bench: resolveName(nameMap.bench, j.bench),
      judges: resolveName(nameMap.judge, j.judges || j.judge),
    }));
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.map((h) => escape(labelMap[h])).join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'judgments-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filtered, nameMap]);

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const split = (line) => {
      const out = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
          else if (ch === '"') inQ = false;
          else cur += ch;
        } else if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const headers = split(lines[0]).map((h) => h.trim());
    return lines.slice(1).map((l) => {
      const cells = split(l);
      const rec = {};
      headers.forEach((h, i) => { rec[h] = (cells[i] ?? '').trim(); });
      return rec;
    });
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const records = parseCsv(String(reader.result || ''))
        .filter((r) => r.title || r.caseName || r.citation)
        .map((r) => ({
          ...r,
          status: 'Active',
          date: r.date || null,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          keywords: [],
          acts: [],
          paragraphs: [],
        }));
      if (records.length) {
        judgmentsRepository.bulkCreate(records)
          .then(() => { loadJudgments(); setPage(1); })
          .catch(() => {});
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const pageNumbers = useMemo(() => {
    const total = totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (safePage > 3) pages.push('...');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(total - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }, [safePage, totalPages]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="loading-block"><span className="spinner" /> Loading judgmentsâ€¦</div>
      </div>
    );
  }

  return (
    <div className="fade-in jl-page">
      {!isMobile ? (
        <>
          <div className="bench-types__hero">
            <div className="bench-types__hero-icon"><Icon name="book" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Case Precedents / Judgments</h2>
              <p>Browse, search, and manage archived judgments and case precedents.</p>
              <div className="bench-types__hero-accent" />
            </div>
            <Button icon="plus" className="jl-add-btn" onClick={() => setShowAddModal(true)}>Add Judgment</Button>
            <Icon name="book" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="jl-stats-row jl-stats-row--4">
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--purple"><Icon name="book" size={22} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Total Judgments</div>
                <div className="jl-stat-value">{stats.total.toLocaleString()}</div>
                <div className="jl-stat-sub">All time</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--green"><Icon name="check-circle" size={22} strokeWidth={2.2} /></div>
              <div>
                <div className="jl-stat-label">Active Judgments</div>
                <div className="jl-stat-value">{stats.active.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.active / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--orange"><Icon name="archive" size={22} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Archived Judgments</div>
                <div className="jl-stat-value">{stats.archived.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.archived / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--pink"><Icon name="heart" size={22} fill /></div>
              <div>
                <div className="jl-stat-label">Favourite Judgments</div>
                <div className="jl-stat-value">{stats.favourite.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.favourite / stats.total * 100) : 0}% of total</div>
              </div>
            </div>
          </div>

          <div className="jl-stats-row jl-stats-row--5">
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--blue"><Icon name="clock" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Recently Added</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.recentlyAdded}</div>
                <div className="jl-stat-sub">This Month</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--teal"><Icon name="eye" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Recently Viewed</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.recentlyViewed}</div>
                <div className="jl-stat-sub">This Month</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--deep-purple"><Icon name="building" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Supreme Court</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.supreme.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.supreme / stats.total * 100) : 0}%</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--sky"><Icon name="building" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">High Court</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.highCourt.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.highCourt / stats.total * 100) : 0}%</div>
              </div>
            </div>
            <div className="jl-stat-card">
              <div className="jl-stat-icon jl-stat-icon--gold"><Icon name="scales" size={20} strokeWidth={2} /></div>
              <div>
                <div className="jl-stat-label">Tribunal Judgments</div>
                <div className="jl-stat-value jl-stat-value--sm">{stats.tribunal.toLocaleString()}</div>
                <div className="jl-stat-sub">{stats.total ? Math.round(stats.tribunal / stats.total * 100) : 0}%</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bench-types__hero jl-hero">
            <div className="bench-types__hero-icon"><Icon name="book" size={34} /></div>
            <div className="bench-types__hero-text">
              <h2>Case Precedents</h2>
              <p>Browse, search, and manage archived judgments.</p>
              <div className="bench-types__hero-accent" />
              <Button icon="plus" onClick={() => setShowAddModal(true)}>Add Judgment</Button>
            </div>
            <Icon name="book" className="bench-types__hero-watermark bench-types__watermark-icon" />
          </div>

          <div className="bench-types__stat-cards bench-types__mobile-only jl-stat-cards-mobile">
            <div className="bench-types__stat-card bench-types__stat-card--total">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="book" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.total.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">TOTAL</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--active">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="check-circle" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.active.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">ACTIVE</div>
            </div>
            <div className="bench-types__stat-card bench-types__stat-card--inactive">
              <div className="bench-types__stat-card-row1">
                <div className="bench-types__stat-card-icon"><Icon name="heart" size={18} /></div>
                <span className="bench-types__stat-card-num">{stats.favourite.toLocaleString()}</span>
              </div>
              <div className="bench-types__stat-card-label">FAVOURITES</div>
            </div>
          </div>
        </>
      )}

      <div className="jl-toolbar">
        <div className="jl-search-box jl-search-box--expanded">
          <Icon name="search" size={15} />
          <input
            placeholder="Search by title, citation, case number, party, judge, court, act, section, keyword..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button variant="ghost" icon="download" onClick={() => fileInputRef.current && fileInputRef.current.click()}>Import</Button>
        <Button variant="ghost" icon="upload" onClick={exportCsv}>Export</Button>
        <Button variant="ghost" icon="more-horizontal" onClick={() => setShowFilters((s) => !s)}>More</Button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="jl-file-input" onChange={handleImportFile} />
      </div>

      {showFilters && (
        <div className="jl-filter-row">
          <select className="jl-filter-select jl-filter-select--native" value={filters.court} onChange={(e) => setFilter('court', e.target.value)}>
            <option value="">All Courts</option>
            {uniqueValues.courts.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.bench} onChange={(e) => setFilter('bench', e.target.value)}>
            <option value="">Bench</option>
            {uniqueValues.benches.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Area of Law</option>
            {uniqueValues.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.typeOfProceeding} onChange={(e) => setFilter('typeOfProceeding', e.target.value)}>
            <option value="">Type of Proceeding</option>
            {uniqueValues.typeOfProceedings.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.natureOfDispute} onChange={(e) => setFilter('natureOfDispute', e.target.value)}>
            <option value="">Nature of Dispute</option>
            {uniqueValues.natureOfDisputes.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.act} onChange={(e) => setFilter('act', e.target.value)}>
            <option value="">Acts</option>
            {uniqueValues.acts.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.provision} onChange={(e) => setFilter('provision', e.target.value)}>
            <option value="">Provision(s)</option>
            {uniqueValues.provisions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.applicableStage} onChange={(e) => setFilter('applicableStage', e.target.value)}>
            <option value="">Applicability</option>
            {uniqueValues.applicableStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="jl-filter-select jl-filter-select--native" value={filters.year} onChange={(e) => setFilter('year', e.target.value)}>
            <option value="">Year of Judgment</option>
            {uniqueValues.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="ghost" icon="filter" onClick={() => setShowFilters(false)}>Hide Filters</Button>
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
      )}

      <Card bodyClass="card__body--flush jl-library-card">
        <div className="table-scroll">
          <table className="table jl-table">
            <thead className="jl-thead">
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h.key} className={h.sortable ? 'th--sortable' : ''}>
                    {h.key === 'checkbox' ? (
                      <input type="checkbox" checked={allSelected && paged.length > 0} onChange={toggleAll} disabled={paged.length === 0} />
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_HEADERS.length} className="jl-empty-cell">
                      <Icon name="book" size={24} />
                      <p className="jl-empty-text">No judgments found.</p>
                    </td>
                  </tr>
                ) : (
                  paged.map((j) => {
                    const isFav = favourites[j.id] ?? j.favourite ?? j.favorited ?? false;
                    return (
                      <tr key={j.id}>
                        <td data-label="Case Number" className="jl-case-num">
                          {(() => {
                            const num = j.caseNumber;
                            const typeLabel = j.caseType ? (nameMap.caseType?.[j.caseType] || j.caseType) : '';
                            const yearSrc = j.date || j.judgmentDate;
                            let year = '';
                            if (yearSrc) {
                              try { year = new Date(yearSrc).getFullYear(); } catch { year = ''; }
                            }
                            if (!num && !typeLabel && !year) return 'â€”';
                            const parts = [];
                            if (typeLabel) parts.push(typeLabel);
                            if (num) parts.push(typeLabel ? `No. ${num}` : num);
                            if (year) parts.push(`of ${year}`);
                            return parts.join(' ');
                          })()}
                        </td>
                        <td data-label="Case Title">
                          <div className="jl-case-title">{j.caseName || j.title || j.citation || 'Untitled'}</div>
                          {j.title !== j.caseName && j.caseName && <div className="jl-case-sub">{j.title}</div>}
                          {!j.caseName && j.parties && <div className="jl-case-sub">{j.parties}</div>}
                        </td>
                        <td data-label="Citation" className="jl-cell-citations">
                          {(() => {
                            const cites = [j.citation, j.neutralCitation, j.reporterCitation].filter(Boolean);
                            if (!cites.length) return <span className="jl-cell-muted">â€”</span>;
                            return (
                              <div className="jl-cit-stack">
                                {cites.map((c, i) => (
                                  <div key={i} className={`jl-cit-line jl-cit-line--c${i % 6}`}>{c}</div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td data-label="Court / Bench" className="jl-cell-strong">
                          {resolveName(nameMap.court, j.court)}
                          {j.bench ? <><br />{resolveName(nameMap.bench, j.bench)}</> : null}
                        </td>
                        <td data-label="Applicability" className="jl-cell-muted">
                          {(() => {
                            const stages = Array.isArray(j.applicableStages)
                              ? j.applicableStages
                              : (j.applicableStages ? String(j.applicableStages).split(/[,;]/) : []);
                            const labels = stages
                              .map((s) => (nameMap.stage[s] ? nameMap.stage[s] : null))
                              .filter(Boolean)
                              .map((s) => s.trim())
                              .filter(Boolean);
                            if (!labels.length) return '—';
                            return (
                              <div className="jl-tag-stack">
                                {labels.map((s, i) => (
                                  <span key={i} className="jl-tag-chip">{s}</span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td data-label="Judgment Date" className="jl-cell-muted">{j.date ? formatDate(j.date) : 'â€”'}</td>
                        <td data-label="Last Updated" className="jl-cell-muted">{j.updatedAt || j.createdAt || j.date ? formatDate(j.updatedAt || j.createdAt || j.date) : 'â€”'}</td>
                        <td data-label="Actions">
                          <div className="jl-actions">
                            <button title="View" onClick={() => navigate(`/research/judgment-library/${j.id}`)}><Icon name="eye" size={15} /></button>
                            <button title="Edit" onClick={() => { setEditing(j); setShowAddModal(true); }}><Icon name="pen" size={15} /></button>
                            <button title="Duplicate" onClick={() => handleDuplicate(j)}><Icon name="copy" size={15} /></button>
                            <button title="Delete" onClick={() => handleDelete(j)}><Icon name="trash" size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
        <div className="jl-pagination-row">
          <div className="jl-pagination jl-pagination--left">
            <button className="jl-page-btn jl-page-btn--nav jl-page-btn--prev" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <Icon name="chevronLeft" size={16} />
              <span>Previous</span>
            </button>
            <span className="jl-page-current">{safePage}</span>
            <button className="jl-page-btn jl-page-btn--nav jl-page-btn--next" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <span>Next</span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
          <div className="jl-pagination jl-pagination--right">
            <label className="jl-per-page">
              <select
                className="jl-per-page-select"
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      <nav className="bench-types__bottom-nav bench-types__mobile-only">
        <button className="bench-types__nav-tab" onClick={() => navigate('/dashboard')}>
          <Icon name="home" size={20} />
          <span>Dashboard</span>
        </button>
        <button className="bench-types__nav-tab" onClick={() => navigate('/cases')}>
          <Icon name="briefcase" size={20} />
          <span>Matters</span>
        </button>
        <button className="bench-types__nav-fab" onClick={() => setShowAddModal(true)}>
          <Icon name="plus" size={24} />
        </button>
        <button className="bench-types__nav-tab" onClick={() => navigate('/cases/order-sheet')}>
          <Icon name="file" size={20} />
          <span>Order Sheet</span>
        </button>
        <button className="bench-types__nav-tab" onClick={() => navigate('/calendar')}>
          <Icon name="calendar" size={20} />
          <span>Calendar</span>
        </button>
      </nav>
      <AddJudgmentModal
        open={showAddModal}
        editing={editing}
        onClose={() => { setShowAddModal(false); setEditing(null); }}
        onSaved={(saved) => {
          setEditing(null);
          if (saved && saved.id) {
            setJudgments((prev) => {
              const idx = prev.findIndex((j) => j.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
          } else {
            loadJudgments();
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Judgment"
        message={`Are you sure you want to delete "${deleteTarget?.title || deleteTarget?.citation || 'this judgment'}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
