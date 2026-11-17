import React from 'react';
import { useRaceState } from '../../context/RaceContext';

export default function StrategyPanel() {
  const state = useRaceState();
  const { drivers, currentStints, telemetry, selectedDriverNumber } = state;

  if (!selectedDriverNumber) {
    return (
      <footer className="pitwall-footer" style={{ justifyContent: 'center' }}>
        <div className="panel-empty" style={{ opacity: 0.5 }}>STRATEGY PANEL (SELECT DRIVER)</div>
      </footer>
    );
  }

  const driver = drivers.get(selectedDriverNumber);
  const stint = currentStints.get(selectedDriverNumber);
  const data = telemetry.get(selectedDriverNumber);
  if (!driver) return null;

  const compound = stint?.compound ?? 'UNKNOWN';
  const lbEntry = state.leaderboard.find(e => e.driver.driver_number === selectedDriverNumber);
  const laps = lbEntry?.laps_on_tyre ?? (stint ? (stint.tyre_age_at_start ?? 0) : 0);
  
  // Fake estimation for pit window based on compound
  let estWindow = '--';
  if (compound === 'SOFT') estWindow = 'L15 - L20';
  if (compound === 'MEDIUM') estWindow = 'L25 - L35';
  if (compound === 'HARD') estWindow = 'L40 - L50';
  if (compound === 'INTERMEDIATE' || compound === 'WET') estWindow = 'WEATHER DEPENDENT';

  const drs = data?.drs ?? 0;
  const drsText = drs >= 10 ? 'ACTIVE' : (drs >= 8 ? 'AVAILABLE' : 'UNAVAILABLE');
  
  const tc = `#${driver.team_colour}`;

  return (
    <footer className="pitwall-footer">
      <div className="strat-driver" style={{ borderLeftColor: tc }}>
        <div className="strat-driver__acronym">{driver.name_acronym}</div>
        <div className="strat-driver__team" style={{ color: tc }}>{driver.team_name}</div>
      </div>

      <div className="strat-pills">
        <div className="strat-pill">
          <span className="strat-pill__label">CURRENT TYRE</span>
          <span className="strat-pill__value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ 
               display: 'inline-block', width: 14, height: 14, borderRadius: '50%', 
               background: `var(--tyre-${compound.toLowerCase()}, #fff)` 
             }} />
             {compound} ({laps} LAPS)
          </span>
        </div>
        
        <div className="strat-pill">
          <span className="strat-pill__label">PIT WINDOW EST.</span>
          <span className="strat-pill__value">{estWindow}</span>
        </div>

        <div className="strat-pill">
          <span className="strat-pill__label">DRS STATUS</span>
          <span className="strat-pill__value" style={{ color: drs >= 10 ? 'var(--accent-green)' : 'inherit' }}>
            {drsText}
          </span>
        </div>
        
        <div className="strat-pill">
          <span className="strat-pill__label">PACE DELTA</span>
          <span className="strat-pill__value">AWAITING SECTOR</span>
        </div>
      </div>
    </footer>
  );
}
