import {
  Session, Driver, PositionEntry, IntervalEntry, LocationEntry,
  CarDataEntry, WeatherEntry, RaceControlEntry, PitEntry,
  StintEntry, LapsEntry
} from './endpoints';
import { fetchOpenF1, fetchAllOpenF1 } from './openf1Client';

export interface MultiViewerTrack {
  x: number[];
  y: number[];
}

export interface SessionData {
  session: Session;
  drivers: Map<number, Driver>;
  positions: PositionEntry[];
  intervals: IntervalEntry[];
  locations: LocationEntry[];
  carData: CarDataEntry[];
  weather: WeatherEntry[];
  raceControl: RaceControlEntry[];
  pits: PitEntry[];
  stints: StintEntry[];
  laps: LapsEntry[];
  startFinishLine: { x: number; y: number } | null;
  trackGeometry: MultiViewerTrack | null;
}

export interface LoadProgress { step: string; done: number; total: number; }

export async function loadSession(
  sessionKey: number,
  onProgress?: (p: LoadProgress) => void
): Promise<SessionData> {
  const report = (step: string, done: number, total: number) => onProgress?.({ step, done, total });
  const steps = 10;
  let stepNum = 0;

  report('Loading session info…', stepNum++, steps);
  const sessionArr = await fetchOpenF1<Session[]>('sessions', { session_key: sessionKey });
  if (!sessionArr.length) throw new Error(`Session ${sessionKey} not found`);
  const session = sessionArr[0];

  report('Loading track map…', stepNum++, steps);
  let trackGeometry: MultiViewerTrack | null = null;
  try {
    const res = await fetch(`https://api.multiviewer.app/api/v1/circuits/${session.circuit_key}/${session.year}`);
    if (res.ok) {
      const data = await res.json();
      trackGeometry = { x: data.x, y: data.y };
    }
  } catch (e) { console.warn('Failed to load track geometry', e); }

  report('Loading drivers…', stepNum++, steps);
  const driversArr = await fetchOpenF1<Driver[]>('drivers', { session_key: sessionKey });
  const drivers = new Map<number, Driver>();
  driversArr.forEach(d => drivers.set(d.driver_number, d));

  report('Loading stints…', stepNum++, steps);
  const stints = await fetchOpenF1<StintEntry[]>('stints', { session_key: sessionKey });

  report('Loading laps…', stepNum++, steps);
  const laps = await fetchOpenF1<LapsEntry[]>('laps', { session_key: sessionKey });
  laps.sort((a, b) => (a.date_start || '').localeCompare(b.date_start || ''));

  report('Loading pit stops…', stepNum++, steps);
  const pits = await fetchOpenF1<PitEntry[]>('pit', { session_key: sessionKey });

  report('Loading positions…', stepNum++, steps);
  const positions = await fetchAllOpenF1<PositionEntry>('position', { session_key: sessionKey },
    (c) => report(`Loading positions… (${c})`, stepNum, steps));
  positions.sort((a, b) => a.date.localeCompare(b.date));

  report('Loading intervals…', stepNum++, steps);
  const intervals = await fetchAllOpenF1<IntervalEntry>('intervals', { session_key: sessionKey },
    (c) => report(`Loading intervals… (${c})`, stepNum, steps));
  intervals.sort((a, b) => a.date.localeCompare(b.date));

  report('Loading weather…', stepNum++, steps);
  const weather = await fetchOpenF1<WeatherEntry[]>('weather', { session_key: sessionKey });
  weather.sort((a, b) => a.date.localeCompare(b.date));

  report('Loading race control…', stepNum++, steps);
  const raceControl = await fetchOpenF1<RaceControlEntry[]>('race_control', { session_key: sessionKey });
  raceControl.sort((a, b) => a.date.localeCompare(b.date));

  report('Loading locations (per driver)…', stepNum++, steps);
  const driverNumbers = Array.from(drivers.keys());
  
  const locations: LocationEntry[] = [];
  let locCount = 0;
  await Promise.all(driverNumbers.map(async (driverNumber) => {
    // Only fetch first page (1000 records = ~5 mins) to prevent massive 429 timeouts
    const loc = await fetchOpenF1<LocationEntry[]>('location', { session_key: sessionKey, driver_number: driverNumber });
    locations.push(...loc);
    locCount++;
    report(`Loading locations… (${locCount}/${driverNumbers.length})`, stepNum - 1, steps);
  }));
  locations.sort((a, b) => a.date.localeCompare(b.date));

  // Compute Start/Finish line from the first lap's date_start
  let startFinishLine: { x: number; y: number } | null = null;
  const validLap = laps.find(l => l.date_start && l.lap_number > 0);
  if (validLap) {
    const loc = locations.find(l => l.driver_number === validLap.driver_number && l.date >= validLap.date_start);
    if (loc) {
      startFinishLine = { x: loc.x, y: loc.y };
    }
  }

  report('Ready!', steps, steps);

  return { session, drivers, positions, intervals, locations, raceControl,
    pits,
    stints,
    laps,
    startFinishLine,
    carData: [], // To be fetched dynamically during replay
    trackGeometry,
    weather,
  };
}

export async function loadDriverTelemetry(
  sessionKey: number,
  driverNumber: number
): Promise<{ locations: LocationEntry[]; carData: CarDataEntry[] }> {
  const [locations, carData] = await Promise.all([
    fetchAllOpenF1<LocationEntry>('location', { session_key: sessionKey, driver_number: driverNumber }),
    fetchAllOpenF1<CarDataEntry>('car_data', { session_key: sessionKey, driver_number: driverNumber }),
  ]);
  locations.sort((a, b) => a.date.localeCompare(b.date));
  carData.sort((a, b) => a.date.localeCompare(b.date));
  return { locations, carData };
}

export async function fetchDriverLocationsAfter(
  sessionKey: number,
  driverNumber: number,
  afterDate: string
): Promise<LocationEntry[]> {
  try {
    return await fetchOpenF1<LocationEntry[]>('location', {
      session_key: sessionKey,
      driver_number: driverNumber,
      'date>': afterDate,
    });
  } catch (e) {
    console.warn(`Failed to prefetch locations for driver ${driverNumber}:`, e);
    return [];
  }
}

export async function fetchDriverCarDataAfter(
  sessionKey: number,
  driverNumber: number,
  afterDate: string
): Promise<CarDataEntry[]> {
  try {
    return await fetchOpenF1<CarDataEntry[]>('car_data', {
      session_key: sessionKey,
      driver_number: driverNumber,
      'date>': afterDate,
    });
  } catch (e) {
    console.warn(`Failed to prefetch carData for driver ${driverNumber}:`, e);
    return [];
  }
}

export async function fetchSessions(year: number): Promise<Session[]> {
  const sessions = await fetchOpenF1<Session[]>('sessions', { year });
  return sessions.sort((a, b) => a.date_start.localeCompare(b.date_start));
}
