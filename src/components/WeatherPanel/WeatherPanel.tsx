import React from 'react';
import { useRaceState } from '../../context/RaceContext';

function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function WeatherPanel() {
  const { weather } = useRaceState();

  if (!weather) {
    return (
      <section className="panel weather-panel weather-panel--compact">
        <div className="panel__title" style={{ paddingBottom: 4 }}>METEOROLOGY</div>
        <div className="panel-empty" style={{ padding: '8px 0' }}>Awaiting weather data…</div>
      </section>
    );
  }

  const trackDelta = (weather.track_temperature - weather.air_temperature).toFixed(1);
  const rainPct = Math.min(100, Math.max(0, weather.rainfall * 50));
  const isWet = weather.rainfall > 0;
  const isHeavy = weather.rainfall > 1.2;
  const rainColor = isHeavy ? '#0073ff' : isWet ? '#0A84FF' : '#32D74B';
  const rainLabel = isHeavy ? 'HEAVY RAIN' : isWet ? 'WET TRACK' : 'DRY TRACK';

  return (
    <section className="panel weather-panel weather-panel--compact">
      <div className="weather-compact-header">
        <span className="panel__title" style={{ border: 'none', padding: 0 }}>METEOROLOGY</span>
        <div className="weather-compact-header__meta">
          <span>PRESSURE: <strong>{weather.pressure.toFixed(1)} hPa</strong></span>
          <span className="weather-status-pill" style={{ color: rainColor, borderColor: rainColor, background: `${rainColor}20` }}>
            {rainLabel}
          </span>
        </div>
      </div>

      {/* 4 Metrics in a clean, space-efficient horizontal row */}
      <div className="weather-compact-metrics">
        <div className="weather-compact-metric">
          <span className="weather-compact-metric__label">🌡 AIR</span>
          <span className="weather-compact-metric__val">{weather.air_temperature.toFixed(1)}°C</span>
        </div>
        <div className="weather-compact-metric">
          <span className="weather-compact-metric__label">🛣 TRACK</span>
          <span className="weather-compact-metric__val" style={{ color: '#FFD60A' }}>
            {weather.track_temperature.toFixed(1)}°C
            <small style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>+{trackDelta}°</small>
          </span>
        </div>
        <div className="weather-compact-metric">
          <span className="weather-compact-metric__label">💧 HUMID</span>
          <span className="weather-compact-metric__val">{weather.humidity.toFixed(0)}%</span>
        </div>
        <div className="weather-compact-metric">
          <span className="weather-compact-metric__label">💨 WIND</span>
          <span className="weather-compact-metric__val">
            {weather.wind_speed.toFixed(1)} m/s <small style={{ fontSize: 10, color: 'var(--text-label)' }}>{windDirLabel(weather.wind_direction)}</small>
          </span>
        </div>
      </div>

      {/* Thin Rain Indicator Track */}
      <div className="weather-compact-rain">
        <div className="weather-compact-rain__bar">
          <div className="weather-compact-rain__fill" style={{ width: `${rainPct}%`, background: rainColor }} />
        </div>
        <span className="weather-compact-rain__val">PRECIP: {weather.rainfall.toFixed(1)} mm/h</span>
      </div>
    </section>
  );
}
