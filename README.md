# LexAI — Indian Legal Litigation Assistant

A production-grade, clean-architecture Legal AI SaaS for Indian litigation. Built with **React + Vite**. Every page is decoupled from databases, AI models, storage, OCR, search and citation engines through a strict provider abstraction.

> **Legal safety rule:** LexAI **never invents citations.** All authorities are *retrieved* from a citation provider and *verified*. If nothing real is found, the app shows **“No verified precedent found.”** — it never fabricates.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

Runs fully offline with the bundled **mock AI**, **local DB** (localStorage, seeded), **local citation index** (real reported judgments) and **mock OCR** — zero credentials required.

---

## Architecture — strict clean layering

```
Pages  →  Logic  →  Services  →  Providers  →  External Systems
(UI)      (rules)   (façade)     (vendor impl)   (OpenAI, Supabase, …)
```

A page **never** imports a database, AI SDK, storage client, search API or citation API. It calls a **hook** or **logic** module. Logic calls **services**. Services call **providers** (selected by a factory from `.env`). Only the provider implementation touches an external system.

```
Page → Logic → Service → Provider(interface) → Vendor SDK / REST
  ✗ Page → Database      ✗ Page → OpenAI      ✗ Page → Supabase      ✗ Page → Search API
```

### Swapping a provider
Change one env var and (if new) add one implementation file. **Nothing else changes.**

| Concern  | Env var                   | Default | Drop-in options |
|----------|---------------------------|---------|-----------------|
| AI       | `VITE_AI_PROVIDER`        | `mock`  | openai, claude, gemini, ollama, deepseek, qwen |
| Database | `VITE_DATABASE_PROVIDER`  | `local` | sqlite, postgres, supabase, firebase, mongodb |
| Storage  | `VITE_STORAGE_PROVIDER`   | `local` | supabase, s3, r2 |
| Search   | `VITE_SEARCH_PROVIDER`    | `local` | meilisearch, elastic |
| Citation | `VITE_CITATION_PROVIDER`  | `local` | indiankanoon, casemine, verdictum, sci-portal |
| OCR      | `VITE_OCR_PROVIDER`       | `mock`  | tesseract, textract, gvision |

Reference real-vendor implementations are included: `OpenAIProvider`, `SupabaseDatabaseProvider`, `IndianKanoonProvider`.

---

## Folder structure

```
src/
  app/
    App.jsx                 # composition root (providers + router)
    pages/                  # UI only — no DB/AI/search/citation/OCR logic
  components/               # reusable UI (Card, Button, Modal, CitationCard, …)
  layouts/                  # AppLayout, Sidebar, Topbar
  logic/                    # business rules (drafting, citation, strategy, …)
  services/                 # façades over providers (the only provider callers)
  providers/
    ai/  database/  storage/  search/  citation/  ocr/   # interface + impls + factory
  hooks/                    # React bridges to the logic layer
  data-layer/               # app-wide contexts (cases, toasts)
  database/                 # seed fixtures for local providers
  config/                   # the ONLY place env vars are read
  utils/  constants/  routes/  styles/
```

---

## Modules (all implemented)

- **Dashboard** — active cases, recent drafts/citations/documents, upcoming hearings
- **Drafting Studio** — 12 draft types, rich-text editor, version history, PDF/DOCX export
- **Citation Search** — Facts → Issue → Search → Retrieve → Verify → Rank → Display
- **Citation Verification Engine** — judgment / citation / paragraph / source checks
- **Legal Research Workspace** — CPC, Evidence Act, BSA, BNSS, BNS, Limitation, Registration, TP Act, Constitution (retrieval-only)
- **Case Analysis** — weaknesses, contradictions, admissions, missing pleadings, limitation & jurisdiction issues
- **Litigation Strategy Engine** — limitation, estoppel, res judicata, non-joinder, jurisdiction, cause-of-action defects
- **Cross Examination Studio** — friendly / hostile / impeachment / admission question banks
- **Evidence Gap Analyzer** — claim ↔ evidence mapping with gaps
- **Document Review** — OCR + extraction of dates, parties, case/plot/khata numbers, exhibits
- **Timeline Builder** — OCR-driven chronology from documents
- **Hearing Notes** — facts, issues, evidence, verified citations, oral submissions
- **Case Vault** — documents, drafts, citations, notes, orders, hearing history per case
- **Cause List** — hearing dates & status, case dropdown, file upload/view, descriptions, case history + template add/update/delete
- **Case Manager** — case-number-wise details with folder-wise documents (suit copy, written statement, petition, deposition, …) and view mode

---

## Provider interfaces

```
AIProvider:       ask, chat, analyzeDocument, generateDraft
DatabaseProvider: list, get, create, update, remove (+ getCase/saveCase/updateCase/deleteCase)
StorageProvider:  upload, download, delete, getUrl
SearchProvider:   index, search
CitationProvider: searchCases, verifyCitation, fetchJudgment, extractParagraphs
OCRProvider:      extract
```

Each family has an `index.js` factory that reads `config` and returns the configured implementation as a singleton.

---

## Data flow example — Citation Search

```
CitationSearch.jsx          (page: collects facts/issue/act/court)
  → citationLogic.search()  (extract issues, enforce no-fabrication, rank)
    → citationService       (façade)
      → getCitationProvider()  → LocalCitationProvider | IndianKanoonProvider
        → real judgment index / Indian Kanoon API
  ← verified, ranked authorities  (or "No verified precedent found.")
```

The AI layer is never asked to produce a citation. Authorities flow only from the citation provider.

---

## Tech notes
- No CSS framework — a hand-built design system (`src/styles/index.css`) with a light professional legal theme, animated sidebar, hover/motion, box-shadows, responsive (desktop-first, mobile-friendly).
- No heavy editor/PDF dependencies — rich text via `contentEditable`, export via print-to-PDF and Word-compatible HTML.
- State persists in `localStorage` for the local provider, so your demo data survives reloads.
```
```
