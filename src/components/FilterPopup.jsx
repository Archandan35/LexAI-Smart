import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

export default function FilterPopup({ open, onClose, categories, options, tempFilters, onTempFilterChange, onApply, onClearAll }) {
  const [activeCategory, setActiveCategory] = useState(categories?.[0]?.key || '');

  useEffect(() => {
    if (open && categories?.length) {
      setActiveCategory(categories[0].key);
    }
  }, [open, categories]);

  if (!open) return null;

  const handleCheckboxChange = (key, value) => {
    const current = tempFilters[key] || [];
    const idx = current.indexOf(value);
    const next = idx >= 0 ? current.filter((v) => v !== value) : [...current, value];
    onTempFilterChange(key, next);
  };

  const getSelectedCount = (key) => (tempFilters[key] || []).length;

  const activeOptions = options?.[activeCategory] || [];

  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className="fp-popup" onClick={(e) => e.stopPropagation()}>
        <div className="fp-header">
          <h2 className="fp-title">Filter</h2>
          <button className="fp-close-btn" onClick={onClose}><Icon name="close" size={20} /></button>
        </div>

        <div className="fp-body">
          <div className="fp-left">
            {categories.map((cat) => {
              const count = getSelectedCount(cat.key);
              return (
                <button
                  key={cat.key}
                  className={`fp-cat ${activeCategory === cat.key ? 'fp-cat--active' : ''}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <span className="fp-cat-label">{cat.label}</span>
                  {count > 0 && <span className="fp-cat-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="fp-right">
            <h3 className="fp-right-title">{categories.find((c) => c.key === activeCategory)?.label}</h3>
            <div className="fp-options">
              {activeOptions.length === 0 ? (
                <p className="fp-no-options">No options available.</p>
              ) : (
                activeOptions.map((opt) => {
                  const checked = (tempFilters[activeCategory] || []).includes(opt.value);
                  return (
                    <label key={opt.value} className={`fp-opt ${checked ? 'fp-opt--checked' : ''}`}>
                      <input
                        type="checkbox"
                        className="fp-opt-input"
                        checked={checked}
                        onChange={() => handleCheckboxChange(activeCategory, opt.value)}
                      />
                      <span className="fp-opt-check" />
                      <span className="fp-opt-label">{opt.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="fp-footer">
          <Button variant="ghost" onClick={onClearAll}>Clear All</Button>
          <Button onClick={onApply}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}
