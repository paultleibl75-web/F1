import React, { useState, useEffect } from 'react';
import { Session } from '../../api/endpoints';
import { fetchSessions } from '../../api/sessionLoader';
import { useRace } from '../../context/RaceContext';

const YEARS = [2025, 2024, 2023];

export default function SessionSelector({ onClose }: { onClose?: () => void }) {
  const { loadSessionData } = useRace();
  const [year, setYear] = useState(2024);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'LIVE' | 'REPLAY'>('REPLAY');

  useEffect(() => {
    setFetching(true);
    setError(null);
    fetchSessions(year)
      .then(s => { 
        setSessions(s); 
        // Automatically select the first race if not in Live mode
        if (mode === 'REPLAY') {
          const firstRace = s.find(x => x.session_name === 'Race');
          setSelectedKey(firstRace?.session_key ?? s[0]?.session_key ?? null);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setFetching(false));
  }, [year, mode]);

  const handleLoad = async () => {
    if (!selectedKey) return;
    setLoadingSession(true);
    await loadSessionData(selectedKey);
    setLoadingSession(false);
    onClose?.();
  };

  const [typeFilter, setTypeFilter] = useState('Race');
  const filtered = sessions.filter(s => s.session_name === typeFilter);

  // Check if there is an active live session based on time
  const now = new Date();
  const liveSession = sessions.find(s => {
    const start = new Date(s.date_start);
    const end = new Date(s.date_end);
    return now >= start && now <= end;
  });

  return (
    <div className="session-overlay">
      <div className="session-modal">
        <div className="session-modal__header">
          <div className="session-modal__logo">🏎 PITWALL</div>
        </div>

        <div className="type-tabs">
          <button 
            className={`type-tab type-tab--live ${mode === 'LIVE' ? 'type-tab--active' : ''}`}
            onClick={() => { setMode('LIVE'); setSelectedKey(liveSession?.session_key ?? null); }}
          >
            ● LIVE
          </button>
          <button 
            className={`type-tab ${mode === 'REPLAY' ? 'type-tab--active' : ''}`}
            onClick={() => { setMode('REPLAY'); }}
          >
            REPLAY
          </button>
        </div>

        {mode === 'LIVE' ? (
          <div className="session-modal__controls">
            {fetching ? (
               <div className="form-loading">Checking live timing…</div>
            ) : liveSession ? (
              <div className="session-list">
                <button
                  className="session-item session-item--active"
                  onClick={() => setSelectedKey(liveSession.session_key)}
                >
                  <span className="session-item__flag">{liveSession.country_code}</span>
                  <span className="session-item__name">{liveSession.country_name} — {liveSession.session_name}</span>
                  <span className="session-item__date">● LIVE</span>
                </button>
              </div>
            ) : (
              <div className="form-loading" style={{ color: 'var(--text-label)', padding: 40, textAlign: 'center' }}>
                NO LIVE SESSION CURRENTLY RUNNING
              </div>
            )}
          </div>
        ) : (
          <div className="session-modal__controls">
            <div className="form-group">
              <label className="form-label">YEAR</label>
              <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">SESSION TYPE</label>
              <div className="type-pills" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Race', 'Sprint', 'Qualifying', 'Practice 1', 'Practice 2', 'Practice 3'].map(t => (
                  <button
                    key={t}
                    style={{ padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: typeFilter === t ? 'var(--text-value)' : 'var(--bg-panel-raised)', color: typeFilter === t ? '#000' : 'var(--text-label)' }}
                    onClick={() => { setTypeFilter(t); setSelectedKey(null); }}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">GRAND PRIX</label>
              {fetching ? (
                <div className="form-loading">Loading sessions…</div>
              ) : error ? (
                <div className="form-error">{error}</div>
              ) : (
                <div className="session-list">
                  {filtered.length === 0 && <div className="form-loading">No sessions found</div>}
                  {filtered.map(s => (
                    <button
                      key={s.session_key}
                      className={`session-item ${selectedKey === s.session_key ? 'session-item--active' : ''}`}
                      onClick={() => setSelectedKey(s.session_key)}
                    >
                      <span className="session-item__flag">{s.country_code}</span>
                      <span className="session-item__name">{s.country_name} — {s.circuit_short_name}</span>
                      <span className="session-item__date">{new Date(s.date_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="load-btn"
          onClick={handleLoad}
          disabled={!selectedKey || loadingSession || (mode === 'LIVE' && !liveSession)}
        >
          {loadingSession ? 'LOADING…' : mode === 'LIVE' ? 'CONNECT LIVE →' : 'LOAD REPLAY →'}
        </button>
      </div>
    </div>
  );
}
