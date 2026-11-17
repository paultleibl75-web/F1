import React, { useEffect, useRef, useContext } from 'react';
import { useRaceState, useRace } from '../../context/RaceContext';
import { EngineContext } from '../../context/EngineContext';
import { fetchAllOpenF1 } from '../../api/openf1Client';
import { CarDataEntry } from '../../api/endpoints';

export default function TelemetryCard() {
  const state = useRaceState();
  const { addTelemetry } = useRace();
  const engine = useContext(EngineContext);
  const { drivers, selectedDriverNumber, currentStints, sessionKey } = state;

  // DOM Refs for direct 60 FPS updates without React re-renders
  const speedRef = useRef<HTMLSpanElement>(null);
  const rpmRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const throttleValRef = useRef<HTMLSpanElement>(null);
  const throttleFillRef = useRef<HTMLDivElement>(null);
  const brakeValRef = useRef<HTMLSpanElement>(null);
  const brakeFillRef = useRef<HTMLDivElement>(null);
  const drsPillRef = useRef<HTMLSpanElement>(null);

  // Lazy-fetch telemetry on driver select
  useEffect(() => {
    if (!selectedDriverNumber || !sessionKey) return;
    
    if ((window as any)[`telemetry_loaded_${selectedDriverNumber}`]) return;
    (window as any)[`telemetry_loaded_${selectedDriverNumber}`] = true;

    fetchAllOpenF1<CarDataEntry>('car_data', { session_key: sessionKey, driver_number: selectedDriverNumber })
      .then(carData => {
        addTelemetry(selectedDriverNumber, carData);
      })
      .catch(e => console.warn('Failed to load telemetry', e));
  }, [selectedDriverNumber, sessionKey, addTelemetry]);

  // 60 FPS continuous update loop for cockpit telemetry
  useEffect(() => {
    if (!engine || !selectedDriverNumber) return;

    let rafId: number;
    const updateCockpit = () => {
      const telem = engine.currentTelemetry.get(selectedDriverNumber);
      if (telem) {
        const speed = Math.round(telem.speed);
        const rpm = Math.round(telem.rpm);
        const throttle = Math.round(telem.throttle);
        const brake = Math.round(telem.brake);
        const gear = telem.gear;
        const isDrsOpen = telem.drs >= 10;

        if (speedRef.current) speedRef.current.textContent = String(speed);
        if (rpmRef.current) rpmRef.current.textContent = String(rpm);
        if (gearRef.current) {
          gearRef.current.textContent = gear > 0 ? String(gear) : gear === 0 ? 'N' : 'R';
        }
        if (throttleValRef.current) throttleValRef.current.textContent = `${throttle}%`;
        if (throttleFillRef.current) throttleFillRef.current.style.width = `${throttle}%`;
        if (brakeValRef.current) brakeValRef.current.textContent = `${brake}%`;
        if (brakeFillRef.current) brakeFillRef.current.style.width = `${brake}%`;
        if (drsPillRef.current) {
          drsPillRef.current.textContent = isDrsOpen ? 'ACTIVE' : 'OFF';
          drsPillRef.current.className = `drs-pill ${isDrsOpen ? 'drs-pill--open' : 'drs-pill--closed'}`;
        }
      }
      rafId = requestAnimationFrame(updateCockpit);
    };

    rafId = requestAnimationFrame(updateCockpit);
    return () => cancelAnimationFrame(rafId);
  }, [engine, selectedDriverNumber]);

  if (!selectedDriverNumber) {
    return (
      <section className="panel telemetry-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="panel-empty" style={{ opacity: 0.6 }}>SELECT A DRIVER FROM THE LEADERBOARD</div>
      </section>
    );
  }

  const driver = drivers.get(selectedDriverNumber);
  const stint = currentStints.get(selectedDriverNumber);

  if (!driver) return null;

  const compound = stint?.compound ?? 'UNKNOWN';
  const lbEntry = state.leaderboard.find(e => e.driver.driver_number === selectedDriverNumber);
  const laps = lbEntry?.laps_on_tyre ?? (stint ? (stint.tyre_age_at_start ?? 0) : 0);
  const tc = `#${driver.team_colour}`;

  return (
    <section className="panel telemetry-card">
      <div className="panel__title">TELEMETRY</div>

      {/* Driver Header */}
      <div className="telem-header" style={{ borderLeftColor: tc }}>
        <div className="telem-header__pos" style={{ color: tc }}>{driver.driver_number}</div>
        <div className="telem-header__info">
          <div className="telem-header__name">{driver.first_name} {driver.last_name}</div>
          <div className="telem-header__team" style={{ color: tc }}>{driver.team_name}</div>
        </div>
      </div>

      {/* Big Bold Speed */}
      <div className="telem-speed">
        <span ref={speedRef} className="telem-speed__value">0</span>
        <span className="telem-speed__unit">KM/H</span>
      </div>

      {/* Gear & RPM Row */}
      <div className="telem-row">
        <div className="telem-field telem-field--grow">
          <div className="telem-field__label">GEAR</div>
          <div ref={gearRef} className="telem-field__value telem-field__value--large">N</div>
        </div>
        <div className="telem-field telem-field--grow">
          <div className="telem-field__label">RPM</div>
          <div ref={rpmRef} className="telem-field__value telem-field__value--large">0</div>
        </div>
      </div>

      {/* Throttle & Brake Pedals Side-by-Side */}
      <div className="telem-row">
        <div className="telem-field telem-field--grow">
          <div className="telem-field__label">
            <span>THROTTLE</span>
            <span ref={throttleValRef}>0%</span>
          </div>
          <div className="gauge-bar">
            <div ref={throttleFillRef} className="gauge-bar__fill" style={{ width: '0%', background: 'var(--accent-green)' }} />
          </div>
        </div>
        <div className="telem-field telem-field--grow">
          <div className="telem-field__label">
            <span>BRAKE</span>
            <span ref={brakeValRef}>0%</span>
          </div>
          <div className="gauge-bar">
            <div ref={brakeFillRef} className="gauge-bar__fill" style={{ width: '0%', background: 'var(--accent-red)' }} />
          </div>
        </div>
      </div>

      {/* DRS & Tyre Compound Side-by-Side */}
      <div className="telem-row" style={{ alignItems: 'stretch' }}>
        <div className="telem-field telem-field--grow" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, padding: '8px 12px' }}>
          <span className="telem-field__label" style={{ marginBottom: 0 }}>DRS</span>
          <span ref={drsPillRef} className="drs-pill drs-pill--closed">OFF</span>
        </div>
        <div className="telem-tyre telem-field--grow" style={{ borderColor: `var(--tyre-${compound.toLowerCase()}, #fff)`, marginBottom: 0, padding: '8px 12px' }}>
          <div className="tyre-circle" style={{ background: `var(--tyre-${compound.toLowerCase()}, #fff)`, color: '#000', width: 28, height: 28, fontSize: 13 }}>
            {compound.charAt(0)}
          </div>
          <div>
            <div className="telem-tyre__compound" style={{ fontSize: 13 }}>{compound}</div>
            <div className="telem-tyre__laps" style={{ fontSize: 10 }}>{laps} LAPS OLD</div>
          </div>
        </div>
      </div>
    </section>
  );
}
