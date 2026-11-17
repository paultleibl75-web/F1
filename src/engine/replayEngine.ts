import { 
  PositionEntry, IntervalEntry, LocationEntry, 
  CarDataEntry, WeatherEntry, RaceControlEntry, StintEntry,
  NormalisedPosition 
} from '../api/endpoints';
import { SessionData, fetchDriverLocationsAfter, fetchDriverCarDataAfter } from '../api/sessionLoader';
import { RaceAction } from './raceState';

export interface ContinuousTelemetry {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
}

interface TimestampedLocation {
  x: number;
  y: number;
  z: number;
  dateMs: number;
  date: string;
}

interface TimestampedCarData {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
  dateMs: number;
}

interface DriverLocState {
  locs: TimestampedLocation[];
  ptr: number;
  velX: number;
  velY: number;
  lastInterpolatedX: number;
  lastInterpolatedY: number;
  maxDateMs: number;
  isFetchingNext: boolean;
}

interface DriverCarDataState {
  carData: TimestampedCarData[];
  ptr: number;
  maxDateMs: number;
  isFetchingNext: boolean;
}

// Catmull-Rom cubic spline interpolation
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// Smoothstep interpolation for acceleration curves (continuous 1st derivative)
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export class ReplayEngine {
  private data: SessionData | null = null;
  private dispatch: React.Dispatch<RaceAction> | null = null;

  public currentTimeMs = 0;
  private startTimeMs   = 0;
  private endTimeMs     = 0;

  private speed: 1 | 2 | 5 = 1;
  private isPlaying = false;
  private rafId: number | null = null;
  private lastRafMs = 0;

  // Jitter buffer offset (ms): guarantees the playhead is bounded by real samples
  private readonly JITTER_BUFFER_MS = 350;

  /** Public: 60 FPS driver positions on track */
  public currentPositions: Map<number, NormalisedPosition> = new Map();
  private locState: Map<number, DriverLocState> = new Map();

  /** Public: 60 FPS continuous telemetry per driver */
  public currentTelemetry: Map<number, ContinuousTelemetry> = new Map();
  private carDataState: Map<number, DriverCarDataState> = new Map();

  /** Fired on every 60fps frame for direct DOM subscriber updates */
  public onPositionsUpdated: (() => void) | null = null;

  // Throttle React TICK dispatches to 5 Hz (200 ms)
  private _lastTickMs = 0;

  // ─── init ─────────────────────────────────────────────────────────────────

  public init(data: SessionData, dispatch: React.Dispatch<RaceAction>) {
    this.data     = data;
    this.dispatch = dispatch;

    const sessionStartMs = new Date(data.session.date_start).getTime();
    this.endTimeMs       = new Date(data.session.date_end).getTime();

    // Smart Start: Detect when cars actually start driving rather than sitting in garage for 2 minutes
    let firstActiveTimeMs = sessionStartMs;
    const movingLoc = data.locations.find(l => Math.abs(l.x) > 20 || Math.abs(l.y) > 20);
    if (movingLoc) {
      const movingTime = new Date(movingLoc.date).getTime();
      // Start 4 seconds before the first movement
      firstActiveTimeMs = Math.max(sessionStartMs, movingTime - 4000);
    }

    this.startTimeMs   = firstActiveTimeMs;
    this.currentTimeMs = this.startTimeMs;

    // Index locations with pre-parsed milliseconds
    this.locState.clear();
    const groupedLocs = new Map<number, TimestampedLocation[]>();
    data.locations.forEach(l => {
      let arr = groupedLocs.get(l.driver_number);
      if (!arr) { arr = []; groupedLocs.set(l.driver_number, arr); }
      arr.push({
        x: l.x,
        y: l.y,
        z: l.z,
        dateMs: new Date(l.date).getTime(),
        date: l.date,
      });
    });

    groupedLocs.forEach((locs, driverNum) => {
      locs.sort((a, b) => a.dateMs - b.dateMs);
      const maxDateMs = locs.length > 0 ? locs[locs.length - 1].dateMs : 0;
      this.locState.set(driverNum, {
        locs,
        ptr: 0,
        velX: 0,
        velY: 0,
        lastInterpolatedX: locs[0]?.x ?? 0,
        lastInterpolatedY: locs[0]?.y ?? 0,
        maxDateMs,
        isFetchingNext: false,
      });
    });

    // Index existing carData if any
    this.carDataState.clear();
    if (data.carData && data.carData.length > 0) {
      this.addTelemetry(data.carData);
    }

    // Clear telemetry loaded flags in window
    for (const k of Object.keys(window)) {
      if (k.startsWith('telemetry_loaded_')) delete (window as any)[k];
    }

    this.dispatch({
      type: 'SESSION_LOADED',
      state: {
        sessionName:     data.session.session_name,
        sessionStart:    data.session.date_start,
        sessionEnd:      data.session.date_end,
        circuitName:     data.session.circuit_short_name,
        country:         data.session.country_name,
        virtualTime:     new Date(this.currentTimeMs).toISOString(),
        drivers:         data.drivers,
        trackGeometry:   data.trackGeometry,
        startFinishLine: data.startFinishLine,
      },
    });

    this.tick();
  }

  public addTelemetry(carData: CarDataEntry[]) {
    if (!this.data) return;
    this.data.carData.push(...carData);

    const grouped = new Map<number, TimestampedCarData[]>();
    carData.forEach(c => {
      let arr = grouped.get(c.driver_number);
      if (!arr) { arr = []; grouped.set(c.driver_number, arr); }
      arr.push({
        speed: c.speed,
        rpm: c.rpm,
        gear: c.n_gear,
        throttle: c.throttle,
        brake: c.brake,
        drs: c.drs,
        dateMs: new Date(c.date).getTime(),
      });
    });

    grouped.forEach((newItems, driverNum) => {
      let state = this.carDataState.get(driverNum);
      if (!state) {
        state = { carData: [], ptr: 0, maxDateMs: 0, isFetchingNext: false };
        this.carDataState.set(driverNum, state);
      }
      state.carData.push(...newItems);
      state.carData.sort((a, b) => a.dateMs - b.dateMs);
      state.maxDateMs = state.carData[state.carData.length - 1].dateMs;
    });
  }

  // ─── Playback controls ────────────────────────────────────────────────────

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastRafMs = performance.now();
    this.dispatch!({ type: 'SET_PLAYING', playing: true });
    this.rafLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.dispatch!({ type: 'SET_PLAYING', playing: false });
  }

  public setSpeed(speed: 1 | 2 | 5) {
    this.speed = speed;
    this.dispatch!({ type: 'SET_SPEED', speed });
  }

  // ─── Main 60 FPS rAF loop ──────────────────────────────────────────────────

  private rafLoop = () => {
    const now = performance.now();
    const dt  = now - this.lastRafMs;
    this.lastRafMs = now;

    this.currentTimeMs += dt * this.speed;
    if (this.currentTimeMs > this.endTimeMs) {
      this.currentTimeMs = this.endTimeMs;
      this.updatePositions();
      this.updateContinuousTelemetry();
      this.pause();
      return;
    }

    // 1. Update 60 FPS positions with cubic spline & jitter buffer
    this.updatePositions();

    // 2. Update 60 FPS continuous telemetry (acceleration curve prediction)
    this.updateContinuousTelemetry();

    // 3. Notify subscribers (TrackMap & TelemetryCard)
    this.onPositionsUpdated?.();

    // 4. Background prefetching if approaching end of loaded chunk
    this.checkBackgroundPrefetch();

    // 5. Throttled React state update at 5 Hz (200 ms)
    if (now - this._lastTickMs >= 200) {
      this._lastTickMs = now;
      this.tick();
    }

    if (this.isPlaying) {
      this.rafId = requestAnimationFrame(this.rafLoop);
    }
  };

  // ─── Continuous 60 FPS Driver Position (Splines + Jitter Buffer) ──────────

  private updatePositions() {
    // Render time delayed by jitter buffer so we are always between two known samples
    const renderTimeMs = this.currentTimeMs - this.JITTER_BUFFER_MS;

    this.locState.forEach((state, driverNum) => {
      const { locs } = state;
      if (!locs.length) return;

      // Advance pointer monotonically
      while (state.ptr < locs.length - 2 && locs[state.ptr + 1].dateMs <= renderTimeMs) {
        const p1 = locs[state.ptr];
        const p2 = locs[state.ptr + 1];
        const dt = p2.dateMs - p1.dateMs;
        if (dt > 0) {
          state.velX = (p2.x - p1.x) / dt;
          state.velY = (p2.y - p1.y) / dt;
        }
        state.ptr++;
      }

      // Catmull-Rom 4-point window: p0, p1, p2, p3
      const p1Index = state.ptr;
      const p0Index = Math.max(0, p1Index - 1);
      const p2Index = Math.min(locs.length - 1, p1Index + 1);
      const p3Index = Math.min(locs.length - 1, p1Index + 2);

      const p0 = locs[p0Index];
      const p1 = locs[p1Index];
      const p2 = locs[p2Index];
      const p3 = locs[p3Index];

      let targetX: number;
      let targetY: number;

      if (renderTimeMs <= p2.dateMs && p2.dateMs > p1.dateMs) {
        // High-precision Catmull-Rom spline interpolation along the curve
        const u = Math.max(0, Math.min(1, (renderTimeMs - p1.dateMs) / (p2.dateMs - p1.dateMs)));
        targetX = catmullRom(p0.x, p1.x, p2.x, p3.x, u);
        targetY = catmullRom(p0.y, p1.y, p2.y, p3.y, u);
      } else {
        // Extrapolation: smoothly coast along velocity vector with friction decay
        const overshootMs = Math.max(0, renderTimeMs - p2.dateMs);
        const decay = Math.exp(-overshootMs / 2000); // 2s half-life
        targetX = p2.x + state.velX * overshootMs * decay;
        targetY = p2.y + state.velY * overshootMs * decay;
      }

      // Damped blending into target to guarantee zero teleportation
      state.lastInterpolatedX = targetX;
      state.lastInterpolatedY = targetY;

      this.currentPositions.set(driverNum, { x: targetX, y: targetY });
    });
  }

  // ─── Continuous 60 FPS Telemetry (Smooth Acceleration Curves) ─────────────

  private updateContinuousTelemetry() {
    this.carDataState.forEach((state, driverNum) => {
      const { carData } = state;
      if (!carData.length) return;

      while (state.ptr < carData.length - 2 && carData[state.ptr + 1].dateMs <= this.currentTimeMs) {
        state.ptr++;
      }

      const c1 = carData[state.ptr];
      const c2 = carData[Math.min(carData.length - 1, state.ptr + 1)];

      let speed: number;
      let rpm: number;
      let throttle: number;
      let brake: number;
      let gear: number;
      let drs: number;

      if (this.currentTimeMs <= c2.dateMs && c2.dateMs > c1.dateMs) {
        const u = (this.currentTimeMs - c1.dateMs) / (c2.dateMs - c1.dateMs);
        // Smoothstep curve ensures continuous velocity/acceleration without stops
        const s = smoothstep(u);

        speed    = c1.speed + (c2.speed - c1.speed) * s;
        rpm      = c1.rpm + (c2.rpm - c1.rpm) * s;
        throttle = c1.throttle + (c2.throttle - c1.throttle) * s;
        brake    = c1.brake + (c2.brake - c1.brake) * s;
        gear     = u >= 0.5 ? c2.gear : c1.gear;
        drs      = u >= 0.5 ? c2.drs : c1.drs;
      } else {
        // Continuous acceleration extrapolation: estimate rate of acceleration
        const dt = Math.max(1, c2.dateMs - c1.dateMs);
        const accelSpeed = (c2.speed - c1.speed) / dt; // km/h per ms
        const accelRpm   = (c2.rpm - c1.rpm) / dt;
        const overshootMs = Math.max(0, this.currentTimeMs - c2.dateMs);
        const decay = Math.exp(-overshootMs / 1200);

        speed    = Math.max(0, Math.min(360, c2.speed + accelSpeed * overshootMs * decay));
        rpm      = Math.max(0, Math.min(15000, c2.rpm + accelRpm * overshootMs * decay));
        throttle = c2.throttle;
        brake    = c2.brake;
        gear     = c2.gear;
        drs      = c2.drs;
      }

      this.currentTelemetry.set(driverNum, {
        speed,
        rpm,
        gear,
        throttle,
        brake,
        drs,
      });
    });
  }

  // ─── Progressive Background Prefetching ───────────────────────────────────

  private checkBackgroundPrefetch() {
    if (!this.data) return;
    const sessionKey = this.data.session.session_key;

    // Prefetch for locations (when within 45s of exhausting loaded window)
    this.locState.forEach((state, driverNum) => {
      if (!state.isFetchingNext && state.maxDateMs > 0 && this.currentTimeMs > state.maxDateMs - 45000) {
        state.isFetchingNext = true;
        const lastIso = new Date(state.maxDateMs).toISOString();
        fetchDriverLocationsAfter(sessionKey, driverNum, lastIso)
          .then(newLocs => {
            if (newLocs.length > 0) {
              const timestamped = newLocs.map(l => ({
                x: l.x,
                y: l.y,
                z: l.z,
                dateMs: new Date(l.date).getTime(),
                date: l.date,
              }));
              state.locs.push(...timestamped);
              state.locs.sort((a, b) => a.dateMs - b.dateMs);
              state.maxDateMs = state.locs[state.locs.length - 1].dateMs;
            }
          })
          .finally(() => {
            state.isFetchingNext = false;
          });
      }
    });

    // Prefetch for carData
    this.carDataState.forEach((state, driverNum) => {
      if (!state.isFetchingNext && state.maxDateMs > 0 && this.currentTimeMs > state.maxDateMs - 45000) {
        state.isFetchingNext = true;
        const lastIso = new Date(state.maxDateMs).toISOString();
        fetchDriverCarDataAfter(sessionKey, driverNum, lastIso)
          .then(newCarData => {
            if (newCarData.length > 0) {
              this.addTelemetry(newCarData);
            }
          })
          .finally(() => {
            state.isFetchingNext = false;
          });
      }
    });
  }

  // ─── React state tick (5 Hz) ──────────────────────────────────────────────

  private tick() {
    if (!this.data || !this.dispatch) return;
    const iso = new Date(this.currentTimeMs).toISOString();
    const upTo = <T extends { date: string }>(arr: T[]) => arr.filter(x => x.date <= iso);

    const tickPositions = upTo(this.data.positions);
    const tickIntervals = upTo(this.data.intervals);
    const tickWeather   = upTo(this.data.weather).pop() ?? null;
    const tickRC        = upTo(this.data.raceControl);

    const latestTelemByDriver = new Map<number, CarDataEntry>();
    upTo(this.data.carData).forEach(c => latestTelemByDriver.set(c.driver_number, c));

    // Find current lap per driver
    const currentLapByDriver = new Map<number, number>();
    this.data.laps.forEach(l => {
      if (l.date_start && l.date_start <= iso) {
        currentLapByDriver.set(l.driver_number, l.lap_number);
      }
    });

    const stintsByDriver = new Map<number, StintEntry>();
    this.data.stints.forEach(s => {
      const currentLap = currentLapByDriver.get(s.driver_number) ?? 0;
      if (currentLap >= s.lap_start) {
        stintsByDriver.set(s.driver_number, s);
      }
    });

    try {
      this.dispatch({
        type: 'TICK',
        virtualTime: iso,
        positions:   tickPositions,
        intervals:   tickIntervals,
        weather:     tickWeather,
        raceControl: tickRC,
        stints:      stintsByDriver,
        currentLaps: currentLapByDriver,
        telemetry:   latestTelemByDriver,
      });
    } catch (err) {
      console.error('[ReplayEngine] dispatch TICK error:', err);
    }
  }
}
