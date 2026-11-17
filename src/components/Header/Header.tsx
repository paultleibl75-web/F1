// c:\Users\pault\Desktop\F1\src\components\Header\Header.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useRace, useRaceState } from '../../context/RaceContext';

function formatTime(iso: string) {
  if (!iso) return '--:--:--';
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } 
  catch { return '--:--:--'; }
}

const FLAG_CONFIG: Record<string, { label: string; bg: string }> = {
  GREEN: { label: 'GREEN FLAG', bg: 'flag-badge--green' },
  YELLOW: { label: 'SAFETY CAR', bg: 'flag-badge--yellow' },
  SC: { label: 'SAFETY CAR', bg: 'flag-badge--yellow' },
  VSC: { label: 'VIRTUAL SC', bg: 'flag-badge--yellow' },
  RED: { label: 'RED FLAG', bg: 'flag-badge--red' },
  CLEAR: { label: 'GREEN FLAG', bg: 'flag-badge--green' },
};

export default function Header() {
  const { play, pause, setSpeed } = useRace();
  const state = useRaceState();
  const { flagStatus, pitLaneOpen, isPlaying, replaySpeed, sessionName, virtualTime, weather, latestRCMessage, loading } = state;

  const flagCfg = FLAG_CONFIG[flagStatus] ?? FLAG_CONFIG.GREEN;
  const rainLabel = !weather ? '--' : weather.rainfall > 1 ? 'HEAVY RAIN' : weather.rainfall > 0 ? 'LIGHT RAIN' : 'DRY';
  const windDir = weather ? `${weather.wind_direction}°` : '--';

  // Make header time smooth but precise
  const [displayTime, setDisplayTime] = useState('--:--:--');
  useEffect(() => { setDisplayTime(formatTime(virtualTime)); }, [virtualTime]);

  return (
    <header className="pitwall-header">
      <div className="header-left">
        <div className="header-logo">PITWALL</div>
        <div className="header-time">
          <span className="header-time__label">SESSION TIME</span>
          <span className="header-time__value">{displayTime}</span>
        </div>
        <div className="header-session">{sessionName || 'NO SESSION LOADED'}</div>
      </div>

      <div className="header-center">
        <div className={`flag-pill ${flagCfg.bg}`}>
          <span className="flag-pill__dot" style={{ background: 'currentColor' }} />
          <span className="flag-pill__label">{flagCfg.label}</span>
          <span className="flag-pill__sub">PIT {pitLaneOpen ? 'OPEN' : 'CLOSED'}</span>
        </div>
        {latestRCMessage && (
          <div className="rc-message rc-message--urgent" style={{ border: 'none', background: 'transparent' }}>
            <span className="rc-banner__icon">📡</span>
            <span className="rc-banner__text">{latestRCMessage}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {weather && (
          <div className="weather-quick">
            <span>🌡 {weather.air_temperature.toFixed(0)}°C / {weather.track_temperature.toFixed(0)}°C</span>
            <span>{rainLabel} | 💨 {weather.wind_speed.toFixed(1)}m/s</span>
          </div>
        )}
        {!loading && state.sessionName && (
          <div className="playback-controls">
            <button className={`ctrl-btn ${isPlaying ? 'ctrl-btn--active' : ''}`} onClick={isPlaying ? pause : play}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            {([1, 2, 5] as const).map(s => (
              <button key={s} className={`ctrl-btn ${replaySpeed === s ? 'ctrl-btn--active' : ''}`} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
