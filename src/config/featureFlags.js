// Feature flags / tunables decoupled from provider wiring.
export const featureFlags = {
  citationGuardrail: true,   // forbid AI-invented citations (legal safety rule)
  versionHistory: true,
  exportPdf: true,
  exportDocx: true,
  ocr: true,
};

export const limits = {
  maxUploadMb: 25,
  maxDraftVersions: 50,
  searchPageSize: 20,
};

export default featureFlags;
