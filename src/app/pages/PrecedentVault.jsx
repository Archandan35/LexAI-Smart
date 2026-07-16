import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import { precedentLogic } from '@/logic/precedentLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function PrecedentVault() {
  const [precedents, setPrecedents] = useState([]);
  const [stats, setStats] = useState({ totalSaved: 0, totalTags: 0, recentlyAdded: 0, favorites: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([precedentLogic.list(), precedentLogic.stats()]).then(([p, s]) => {
      setPrecedents(Array.isArray(p) ? p : []);
      if (s && !s.error) setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = precedents.filter((p) => !search || (p.title || '').toLowerCase().includes(search.toLowerCase()) || (p.citation || '').toLowerCase().includes(search.toLowerCase()));

  const toggleFav = async (p) => {
    await precedentLogic.update(p.id, { is_favorite: !p.is_favorite }); load();
  };

  return (
    <div className="fade-in">
      <PageHeader title="Precedent Vault" icon="bookmark" />
      <div className="stats-row">
        <div className="stat-card"><div className="stat-card__icon"><Icon name="bookmark" size={20} /></div><div className="stat-card__value">{stats.totalSaved}</div><div className="stat-card__label">Saved Precedents</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="tag" size={20} /></div><div className="stat-card__value">{stats.totalTags}</div><div className="stat-card__label">Tags</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="clock" size={20} /></div><div className="stat-card__value">{stats.recentlyAdded}</div><div className="stat-card__label">Recently Added</div></div>
        <div className="stat-card"><div className="stat-card__icon"><Icon name="star" size={20} /></div><div className="stat-card__value">{stats.favorites}</div><div className="stat-card__label">Favorites</div></div>
      </div>
      <Card bodyClass="card__body--flush">
        <div className="toolbar-row" style={{ padding: '14px 18px 0' }}>
          <Input className="search-row__input" placeholder="Search by title or citation..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <div className="loading-block"><span className="spinner" /></div> : filtered.length === 0 ? (
          <div className="empty-state"><Icon name="bookmark" /><p>No precedents saved yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="table"><thead><tr><th>Title</th><th>Citation</th><th>Court</th><th>Date</th><th>Favorite</th></tr></thead>
              <tbody>{filtered.map((p) => (
                <tr key={p.id}><td>{p.title}</td><td>{p.citation}</td><td>{p.court}</td><td>{p.date}</td>
                  <td><button className="btn-icon" onClick={() => toggleFav(p)}><Icon name={p.is_favorite ? 'star' : 'star'} /></button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

