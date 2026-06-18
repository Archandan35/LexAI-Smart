# LexAI Architecture Reference

## 1. Layer contract

| Layer | Folder | May import | May NOT import |
|-------|--------|-----------|----------------|
| Pages | `app/pages` | components, hooks, logic, constants, utils | services, providers, any SDK |
| Components | `components`, `layouts` | other components, utils, constants, contexts | services, providers |
| Hooks | `hooks` | logic, utils | providers directly |
| Logic | `logic` | services, utils, constants | providers directly (uses services) |
| Services | `services` | provider factories (`providers/*/index.js`) | pages, logic |
| Providers | `providers/<kind>` | external SDKs/REST, config, seed | pages, logic, services |
| Config | `config` | env | everything (it's a leaf) |

**Enforced rule:** the dependency arrow always points down. Pages cannot reach the bottom layers.

## 2. Page hierarchy

```
App (ToastProvider → AppDataProvider → Router)
└── AppLayout (Sidebar + Topbar + Outlet)
    ├── /                 Dashboard
    ├── /drafting         DraftingStudio
    ├── /citations        CitationSearch
    ├── /verify           CitationVerify
    ├── /research         LegalResearch
    ├── /analysis         CaseAnalysis
    ├── /strategy         StrategyEngine
    ├── /cross-examination CrossExamination
    ├── /evidence         EvidenceGap
    ├── /documents        DocumentReview
    ├── /timeline         TimelineBuilder
    ├── /hearing-notes    HearingNotes
    ├── /cases            CaseVault
    ├── /cases/:id        CaseDetail
    ├── /cause-list       CauseList
    ├── /case-manage      CaseManage
    └── *                 NotFound
```

## 3. Component hierarchy (shared)

```
Icon ─┐
      ├─ Button ── (used everywhere)
Card ─┤
Modal ┤
Badge ┤
Field/Input/Textarea/Select
EmptyState · Spinner · PageHeader · GuardrailBanner
FileDrop ── (OCR-bound uploads)
CaseSelect ── (reads AppDataContext)
CitationCard ── (renders verified judgments only)
RichTextEditor ── (contentEditable, no external dep)
```

## 4. Provider factory pattern

```
config.providers.<kind>  ──►  providers/<kind>/index.js  ──►  registry[name]()  ──►  singleton
```

Adding a vendor = add a class implementing the interface + one line in the registry. No upstream change.

## 5. Citation safety pipeline

```
Facts ─► extractIssues() ─► citationService.searchCases() ─► provider retrieval
      ─► verify (verifyCitation) ─► rank by relevance ─► display
      └─ if empty ─► "No verified precedent found."
```

The AI provider's system prompt forbids inventing authorities; citations are sourced exclusively through `CitationProvider`. These two controls together guarantee no hallucinated precedent reaches the UI.

## 6. Data collections (DatabaseProvider)

`cases · drafts · documents · hearings · notes · judgments · causeListTemplates`

All accessed through the uniform `list/get/create/update/remove` contract so any backend (SQLite, Postgres, Supabase, Firebase, Mongo) can satisfy it.
