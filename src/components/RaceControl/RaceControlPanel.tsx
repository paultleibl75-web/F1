import React, { useRef, useEffect } from 'react';
import { useRaceState } from '../../context/RaceContext';
import { RaceControlEntry } from '../../api/endpoints';

function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag) return null;
  const f = flag.toUpperCase();
  if (f === 'RED') return <span className="flag-badge flag-badge--red">RED</span>;
  if (f === 'YELLOW' || f === 'DOUBLE YELLOW') return <span className="flag-badge flag-badge--yellow">YEL</span>;
  if (f === 'GREEN' || f === 'CLEAR') return <span className="flag-badge flag-badge--green">GRN</span>;
  if (f === 'BLUE') return <span className="flag-badge flag-badge--blue">BLU</span>;
  if (f === 'SAFETY CAR' || f.includes('SAFETY')) return <span className="flag-badge flag-badge--yellow">SC</span>;
  if (f === 'CHEQUERED') return <span className="flag-badge flag-badge--white">🏁</span>;
  return <span className="flag-badge flag-badge--neutral">{f.slice(0, 3)}</span>;
}

function formatRCTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return '--'; }
}

function RCMessage({ entry }: { entry: RaceControlEntry }) {
  const isUrgent = entry.flag?.toUpperCase() === 'RED' || entry.category?.toUpperCase() === 'SAFETY CAR';
  return (
    <div className={`rc-message ${isUrgent ? 'rc-message--urgent' : ''}`}>
      <span className="rc-message__time">{formatRCTime(entry.date)}</span>
      <FlagBadge flag={entry.flag ?? null} />
      <span className="rc-message__text">{entry.message}</span>
    </div>
  );
}

export default function RaceControlPanel() {
  const { raceControlMessages } = useRaceState();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [raceControlMessages.length]);

  const reversed = [...raceControlMessages].reverse();

  return (
    <section className="panel rc-panel">
      <div className="panel__title">RACE CONTROL</div>
      <div className="rc-scroll" ref={scrollRef}>
        {reversed.length === 0 ? (
          <div className="panel-empty">NO FLAG CALLS YET</div>
        ) : (
          reversed.map((msg, i) => <RCMessage key={i} entry={msg} />)
        )}
      </div>
    </section>
  );
}
