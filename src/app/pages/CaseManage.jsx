import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Modal from '@/components/Modal.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import FileDrop from '@/components/FileDrop.jsx';
import { Field, Select } from '@/components/Field.jsx';
import { fileLogic } from '@/logic/fileLogic.js';
import { useAppData } from '@/data-layer/AppDataContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { formatDate, bytes } from '@/utils/format.js';

// Document folders shown per case. Uploads are filed into the chosen folder.
const FOLDERS = [
  { id: 'Suit Copy', icon: 'doc' },
  { id: 'Written Statement', icon: 'file' },
  { id: 'Petition', icon: 'doc' },
  { id: 'Deposition', icon: 'mic' },
  { id: 'Orders', icon: 'notes' },
  { id: 'Evidence', icon: 'layers' },
  { id: 'Other Documents', icon: 'folder' },
];

export default function CaseManage() {
  const toast = useToast();
  const { cases } = useAppData();
  const [caseId, setCaseId] = useState('');
  const [docs, setDocs] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState(FOLDERS[0].id);
  const [viewer, setViewer] = useState(null);

  const theCase = cases.find((c) => c.id === caseId);

  const load = useCallback(async () => {
    if (!caseId) { setDocs([]); return; }
    const list = await fileLogic.listDocuments(caseId);
    setDocs(list);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  // Auto-select first case for convenience.
  useEffect(() => { if (!caseId && cases.length) setCaseId(cases[0].id); }, [cases, caseId]);

  const folderDocs = (folder) => docs.filter((d) => (d.folder || 'Other Documents') === folder);

  const onUpload = async (file) => {
    await fileLogic.uploadDocument(file, { caseId, folder: uploadFolder });
    setUploadOpen(false);
    await load();
    toast.push(`Filed under ${uploadFolder}.`, 'success');
  };

  const openViewer = async (doc) => {
    const url = doc.ref ? await fileLogic.getUrl(doc.ref) : null;
    setViewer({ doc, url });
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="folder"
        title="Case Manager"
        subtitle="Case-number-wise view of all case details and documents — suit copy, written statement, petition, deposition and other documents organised folder-wise with view mode."
        actions={<Button icon="upload" disabled={!caseId} onClick={() => setUploadOpen(true)}>Upload Document</Button>}
      />

      <Card style={{ marginBottom: 20 }}>
        <Field label="Select Case Number">
          <Select value={caseId} onChange={(e) => { setCaseId(e.target.value); setActiveFolder(null); }}>
            <option value="">Select a case…</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
          </Select>
        </Field>
      </Card>

      {!theCase ? (
        <Card><EmptyState icon="folder" title="Select a case number to manage." /></Card>
      ) : (
        <>
          {/* Case detail strip */}
          <Card title="Case Details" sub={theCase.caseNumber} style={{ marginBottom: 20 }}>
            <div className="grid-3">
              <Detail label="Case Number" value={theCase.caseNumber} />
              <Detail label="Parties" value={theCase.title} />
              <Detail label="Court" value={theCase.court} />
              <Detail label="Plaintiff" value={theCase.parties?.plaintiff} />
              <Detail label="Defendant" value={theCase.parties?.defendant} />
              <Detail label="Stage" value={theCase.stage} badge />
              <Detail label="Next Hearing" value={formatDate(theCase.nextHearing)} />
              <Detail label="Status" value={theCase.status} badge />
              <Detail label="Documents" value={`${docs.length} file(s)`} />
            </div>
          </Card>

          {/* Folder grid OR folder contents */}
          {!activeFolder ? (
            <Card title="Document Folders" sub="Click a folder to view its documents">
              <div className="grid-3">
                {FOLDERS.map((f) => {
                  const count = folderDocs(f.id).length;
                  return (
                    <div key={f.id} className="folder" onClick={() => setActiveFolder(f.id)}>
                      <div className="folder__icon"><Icon name={f.icon} size={19} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 650, fontSize: 14 }}>{f.id}</div>
                        <div className="folder__count">{count} document(s)</div>
                      </div>
                      <Icon name="arrow" size={15} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card
              title={activeFolder}
              sub={`${folderDocs(activeFolder).length} document(s)`}
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="ghost" icon="arrow" onClick={() => setActiveFolder(null)} style={{ transform: 'scaleX(-1)' }} />
                  <Button size="sm" icon="upload" onClick={() => { setUploadFolder(activeFolder); setUploadOpen(true); }}>Upload</Button>
                </div>
              }
            >
              {folderDocs(activeFolder).length === 0 ? (
                <EmptyState icon="file" title={`No documents in ${activeFolder}.`} action={<Button size="sm" icon="upload" onClick={() => { setUploadFolder(activeFolder); setUploadOpen(true); }}>Upload</Button>} />
              ) : (
                <table className="table">
                  <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th /></tr></thead>
                  <tbody>
                    {folderDocs(activeFolder).map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}><Icon name="file" size={14} /> {d.name}</td>
                        <td><Badge tone="grey">{(d.mime || '').split('/')[1] || 'file'}</Badge></td>
                        <td>{bytes(d.size)}</td>
                        <td>{formatDate(d.uploadedAt)}</td>
                        <td><Button size="sm" variant="ghost" icon="eye" onClick={() => openViewer(d)}>View</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        title="Upload Document"
        onClose={() => setUploadOpen(false)}
      >
        <Field label="File Into Folder">
          <Select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
            {FOLDERS.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
          </Select>
        </Field>
        <FileDrop onFile={onUpload} hint="PDF · DOCX · Image" />
      </Modal>

      {/* Document viewer */}
      <Modal
        open={!!viewer}
        title={viewer?.doc?.name || 'Document'}
        size="lg"
        onClose={() => setViewer(null)}
      >
        {viewer?.url ? (
          /image\//.test(viewer.doc.mime) ? (
            <img src={viewer.url} alt={viewer.doc.name} style={{ width: '100%', borderRadius: 10 }} />
          ) : /pdf/.test(viewer.doc.mime) ? (
            <iframe title="doc" src={viewer.url} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 10 }} />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: '60vh', overflow: 'auto' }}>
              {viewer.doc.text || 'No inline preview available.'}
            </div>
          )
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: '60vh', overflow: 'auto' }}>
            {viewer?.doc?.text || 'No preview available for this seeded document.'}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value, badge }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>
        {badge ? <Badge tone="navy">{value}</Badge> : (value || '—')}
      </div>
    </div>
  );
}
