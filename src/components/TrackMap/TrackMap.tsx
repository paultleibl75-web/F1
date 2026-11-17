import React, { useMemo, useContext, useEffect, useRef } from 'react';
import { useRaceState, useRace } from '../../context/RaceContext';
import { EngineContext } from '../../context/EngineContext';

export default function TrackMap() {
  const state = useRaceState();
  const { selectDriver } = useRace();
  const engine = useContext(EngineContext);
  const { drivers, selectedDriverNumber, flagStatus, trackGeometry, startFinishLine } = state;

  const dotsRef = useRef<Map<number, SVGGElement>>(new Map());
  const rafRef  = useRef<number>();
  const boundsRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number; w: number; h: number } | null>(null);

  const { path, startPt } = useMemo(() => {
    if (!trackGeometry || !trackGeometry.x.length) return { path: '', startPt: null };
    const { x, y } = trackGeometry;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < x.length; i++) {
      if (x[i] < minX) minX = x[i];
      if (x[i] > maxX) maxX = x[i];
      if (y[i] < minY) minY = y[i];
      if (y[i] > maxY) maxY = y[i];
    }
    const dx = maxX - minX, dy = maxY - minY;
    minX -= dx * 0.095; maxX += dx * 0.095;
    minY -= dy * 0.095; maxY += dy * 0.095;
    const w = maxX - minX, h = maxY - minY;
    boundsRef.current = { minX, maxX, minY, maxY, w, h };

    const pts = x.map((vx, i) => {
      const px = ((vx - minX) / w) * 100;
      const py = ((y[i] - minY) / h) * 100;
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
    });

    // Start/finish line: find closest point to actual timing line
    let startIdx = 0;
    if (startFinishLine && x.length > 0) {
      let minD = Infinity;
      for (let i = 0; i < x.length; i++) {
        const dX = x[i] - startFinishLine.x;
        const dY = y[i] - startFinishLine.y;
        const dist = dX * dX + dY * dY;
        if (dist < minD) {
          minD = dist;
          startIdx = i;
        }
      }
    }
    const nextIdx = (startIdx + 1) % x.length;
    const sx = ((x[startIdx] - minX) / w) * 100;
    const sy = ((y[startIdx] - minY) / h) * 100;
    const sx2 = ((x[nextIdx] - minX) / w) * 100;
    const sy2 = ((y[nextIdx] - minY) / h) * 100;
    const dxn = sx2 - sx, dyn = sy2 - sy;
    const len = Math.sqrt(dxn * dxn + dyn * dyn) || 1;
    // Perpendicular unit vector
    const px0 = -dyn / len, py0 = dxn / len;
    const lLen = 2.8; // length of start/finish line in SVG units
    const startPt = {
      x1: sx + px0 * lLen, y1: sy + py0 * lLen,
      x2: sx - px0 * lLen, y2: sy - py0 * lLen,
    };

    return { path: pts.join(' ') + ' Z', startPt };
  }, [trackGeometry, startFinishLine]);

  // Imperative rAF: move SVG <g> elements directly, zero React re-renders
  useEffect(() => {
    if (!engine) return;
    const loop = () => {
      const b = boundsRef.current;
      if (b) {
        engine.currentPositions.forEach((pos, driverNum) => {
          const g = dotsRef.current.get(driverNum);
          if (!g) return;
          if (pos.x === 0 && pos.y === 0) {
            g.style.opacity = '0';
            return;
          }
          g.style.opacity = '1';
          const nx = ((pos.x - b.minX) / b.w) * 100;
          const ny = ((pos.y - b.minY) / b.h) * 100;
          g.setAttribute('transform', `translate(${nx.toFixed(3)},${ny.toFixed(3)})`);
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [engine]);

  const scColor = flagStatus === 'RED'               ? 'rgba(255,69,58,0.10)'  :
                  (flagStatus === 'SC' || flagStatus === 'VSC') ? 'rgba(255,214,10,0.10)' : 'transparent';

  return (
    <section className="panel track-map-panel">
      {/* Floating label */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 10,
        fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--text-value)', background: 'rgba(0,0,0,0.65)',
        padding: '6px 14px', borderRadius: 20, backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        TRACK MAP
        {flagStatus === 'SC'  && <span className="flag-badge flag-badge--yellow">SC</span>}
        {flagStatus === 'VSC' && <span className="flag-badge flag-badge--yellow">VSC</span>}
        {flagStatus === 'RED' && <span className="flag-badge flag-badge--red">RED FLAG</span>}
      </div>

      {!path && <div className="panel-empty" style={{ paddingTop: 140, fontSize: 14, fontWeight: 700 }}>AWAITING TRACK DATA…</div>}

      {path && (
        <svg
          className="track-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {scColor !== 'transparent' && <rect x={0} y={0} width={100} height={100} fill={scColor} />}

          {/* Track outline: outer glow + inner bright line */}
          <path d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7}   strokeLinejoin="round" />
          <path d={path} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={4.0} strokeLinejoin="round" />
          <path d={path} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.8} strokeLinejoin="round" />

          {/* Start / Finish line */}
          {startPt && (
            <line
              x1={startPt.x1} y1={startPt.y1}
              x2={startPt.x2} y2={startPt.y2}
              stroke="#ffffff" strokeWidth={1.5} strokeDasharray="1.0 0.6"
              opacity={0.95}
            />
          )}

          {/* Driver dots: rendered once by React, moved imperatively by rAF */}
          {Array.from(drivers.entries()).map(([driverNum, driver]) => {
            const color = `#${driver.team_colour || 'ffffff'}`;
            const isSelected = selectedDriverNumber === driverNum;
            return (
              <g
                key={driverNum}
                ref={el => { if (el) dotsRef.current.set(driverNum, el); else dotsRef.current.delete(driverNum); }}
                style={{ cursor: 'pointer' }}
                onClick={() => selectDriver(driverNum)}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle r={4.5} fill="none" stroke="#00d7ff" strokeWidth={0.9} opacity={0.95} />
                )}
                {/* Team-colored dot with subtle shadow ring */}
                <circle r={2.5} fill="rgba(0,0,0,0.7)" />
                <circle r={2.1} fill={color} stroke="#000" strokeWidth={0.3} />
                {/* Acronym label - bold and high contrast */}
                <text
                  y={-3.4}
                  textAnchor="middle"
                  fontSize={3.4}
                  fill={isSelected ? '#00d7ff' : '#ffffff'}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={800}
                  stroke="#000000"
                  strokeWidth={0.6}
                  paintOrder="stroke fill"
                  style={{ pointerEvents: 'none' }}
                >
                  {driver.name_acronym}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </section>
  );
}
