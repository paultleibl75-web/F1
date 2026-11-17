import React from 'react';
import { useRaceState } from '../../context/RaceContext';
import { useRace } from '../../context/RaceContext';
import { useSmoothedValue } from '../../hooks/useSmoothedValue';

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#e8002d',
  MEDIUM: '#ffc906',
  HARD: '#e8edf5',
  INTERMEDIATE: '#00d084',
  WET: '#0073ff',
  UNKNOWN: '#5a7090',
};

const COMPOUND_LETTER: Record<string, string> = {
  SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W', UNKNOWN: '?',
};

function TyrePill({ compound, laps }: { compound: string; laps: number }) {
  const color = COMPOUND_COLORS[compound] ?? '#5a7090';
  const letter = COMPOUND_LETTER[compound] ?? '?';
  return (
    <span className="tyre-pill" style={{ borderColor: color, color }}>
      <span className="tyre-pill__circle" style={{ background: color }}>{letter}</span>
      <span className="tyre-pill__laps">{laps}</span>
    </span>
  );
}

function GapDisplay({ gapStr }: { gapStr?: string | number | null }) {
  const raw = gapStr == null ? '' : String(gapStr);
  const val = parseFloat(raw);
  const isNumber = !isNaN(val) && raw.includes('.');
  const smoothed = useSmoothedValue(isNumber ? val : 0, 250);

  if (!raw) return <span>--</span>;
  if (!isNumber) return <span>{raw}</span>;

  return <span>+{smoothed.toFixed(3)}</span>;
}

export default function Leaderboard() {
  const state = useRaceState();
  const { selectDriver } = useRace();
  const { leaderboard, selectedDriverNumber } = state;

  return (
    <section className="panel leaderboard" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="panel__title">LEADERBOARD</div>
      
      {/* Table Header with continuous straight dividing line */}
      <div className="lb-header">
        <span className="lb-col-pos">P</span>
        <span className="lb-col-driver">DRIVER</span>
        <span className="lb-col-tyre">TYRE</span>
        <span className="lb-col-gap">GAP</span>
      </div>

      {/* Continuous scrollable list of driver rows with single straight border-bottom */}
      <div className="lb-scroll-container" style={{ flex: 1, overflowY: 'auto' }}>
        {leaderboard.map((entry) => {
          const tc = `#${entry.driver.team_colour || 'ffffff'}`;
          const isSelected = selectedDriverNumber === entry.driver.driver_number;
          const compound = entry.current_stint?.compound ?? 'UNKNOWN';
          const lapsOnTyre = entry.laps_on_tyre ?? (entry.current_stint?.tyre_age_at_start ?? 0);

          return (
            <div
              key={entry.driver.driver_number}
              className={`lb-row ${isSelected ? 'lb-row--selected' : ''}`}
              onClick={() => selectDriver(entry.driver.driver_number)}
            >
              <div className="lb-col-pos">{entry.position}</div>
              <div className="lb-col-driver">
                <span className="lb-team-stripe" style={{ background: tc }} />
                <div className="lb-driver-info">
                  <span className="lb-driver__acronym">{entry.driver.name_acronym}</span>
                  <span className="lb-driver__team" style={{ color: tc }}>{entry.driver.team_name}</span>
                </div>
              </div>
              <div className="lb-col-tyre">
                <TyrePill compound={compound} laps={lapsOnTyre} />
              </div>
              <div className="lb-col-gap">
                {entry.position === 1 ? (
                  <span className="lb-gap--leader">LEADER</span>
                ) : (
                  <GapDisplay gapStr={entry.gap_to_leader} />
                )}
              </div>
            </div>
          );
        })}
        {leaderboard.length === 0 && (
          <div className="lb-empty" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            Waiting for data…
          </div>
        )}
      </div>
    </section>
  );
}
