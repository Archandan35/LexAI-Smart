import React, { useState, useEffect, useTransition } from 'react';
import Modal from '@/components/Modal.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import SingleAdd from './SingleAdd.jsx';
import SingleEdit from './SingleEdit.jsx';
import SingleDelete from './SingleDelete.jsx';
import BulkAdd from './BulkAdd.jsx';
import BulkEdit from './BulkEdit.jsx';
import BulkDelete from './BulkDelete.jsx';
import BulkImport from './BulkImport.jsx';
import { TipBox } from './utils.js';
import { TABS, TIPS, SUBTITLES } from './constants.js';

export default function CrudManager({ open, onClose, entity, config }) {
  const [tab, setTab] = useState('single-add');
  const [, startTransition] = useTransition();

  useEffect(() => { if (open) setTab('single-add'); }, [open]);

  const handleTabChange = (id) => {
    startTransition(() => { setTab(id); });
  };

  const subtitle = SUBTITLES[tab]?.(entity) ?? '';
  const tip = TIPS[tab]?.(entity, config) ?? '';

  return (
    <Modal
      open={open}
      title={`Manage ${entity}`}
      subtitle={subtitle}
      onClose={onClose}
      size="lg"
      className="crud-modal"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="crud-tabs">
        {TABS.map((t, i) => {
          const prev = TABS[i - 1];
          const showDivider = prev && t.group !== prev.group;
          return (
            <React.Fragment key={t.id}>
              {showDivider && <div className="crud-tab-divider" />}
              <button
                type="button"
                className={[
                  'crud-tab',
                  t.danger ? 'crud-tab--danger' : '',
                  t.special === 'import' ? 'crud-tab--import' : '',
                  tab === t.id ? 'crud-tab--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleTabChange(t.id)}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div key={`${entity}-${tab}`}>
        {tab === 'single-add' && <SingleAdd config={config} entity={entity} />}
        {tab === 'single-edit' && <SingleEdit config={config} entity={entity} />}
        {tab === 'single-delete' && <SingleDelete config={config} entity={entity} />}
        {tab === 'bulk-add' && <BulkAdd config={config} entity={entity} />}
        {tab === 'bulk-edit' && <BulkEdit config={config} entity={entity} />}
        {tab === 'bulk-delete' && <BulkDelete config={config} entity={entity} />}
        {tab === 'import' && <BulkImport config={config} entity={entity} />}
      </div>

      <TipBox text={tip} />
    </Modal>
  );
}
