import {
  Driver, PositionEntry, IntervalEntry, LocationEntry,
  CarDataEntry, WeatherEntry, RaceControlEntry, StintEntry,
  LeaderboardEntry, FlagStatus, NormalisedPosition
} from '../api/endpoints';
import { MultiViewerTrack } from '../api/sessionLoader';

export interface RaceState {
  sessionKey: number | null;
  sessionName: string;
  sessionStart: string;
  sessionEnd: string;
  circuitName: string;
  country: string;

  virtualTime: string;
  replaySpeed: 1 | 2 | 5;
  isPlaying: boolean;

  drivers: Map<number, Driver>;
  leaderboard: LeaderboardEntry[];

  driverMapPositions: Map<number, NormalisedPosition>;
  trackGeometry: MultiViewerTrack | null;
  trackBounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  startFinishLine: { x: number; y: number } | null;

  telemetry: Map<number, CarDataEntry>;
  currentStints: Map<number, StintEntry>;

  weather: WeatherEntry | null;
  raceControlMessages: RaceControlEntry[];
  flagStatus: FlagStatus;
  pitLaneOpen: boolean;
  latestRCMessage: string;

  selectedDriverNumber: number | null;
  loading: boolean;
  loadingStep: string;
  loadingProgress: number;
  error: string | null;
}

export type RaceAction =
  | { type: 'SET_LOADING'; step: string; progress: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SESSION_LOADED'; state: Partial<RaceState> }
  | {
      type: 'TICK';
      virtualTime: string;
      positions: PositionEntry[];
      intervals: IntervalEntry[];
      weather: WeatherEntry | null;
      raceControl: RaceControlEntry[];
      stints: Map<number, StintEntry>;
      currentLaps: Map<number, number>;
      telemetry: Map<number, CarDataEntry>;
    }
  | { type: 'UPDATE_MAP_POSITIONS'; positions: Map<number, NormalisedPosition> }
  | { type: 'UPDATE_TELEMETRY'; driverNumber: number; carData: CarDataEntry[] }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_SPEED'; speed: 1 | 2 | 5 }
  | { type: 'SELECT_DRIVER'; driverNumber: number | null }
  | { type: 'RESET' };

export const initialState: RaceState = {
  sessionKey: null, sessionName: '', sessionStart: '', sessionEnd: '', circuitName: '', country: '',
  virtualTime: '', replaySpeed: 1, isPlaying: false,
  drivers: new Map(), leaderboard: [],
  driverMapPositions: new Map(), trackGeometry: null, trackBounds: null, startFinishLine: null,
  telemetry: new Map(), currentStints: new Map(),
  weather: null, raceControlMessages: [], flagStatus: 'GREEN', pitLaneOpen: true, latestRCMessage: '',
  selectedDriverNumber: null,
  loading: false, loadingStep: '', loadingProgress: 0, error: null,
};

function deriveFlagStatus(messages: RaceControlEntry[]): FlagStatus {
  const recent = [...messages].reverse();
  for (const msg of recent) {
    const f = (msg.flag ?? '').toUpperCase();
    const cat = (msg.category ?? '').toUpperCase();
    if (f === 'RED') return 'RED';
    if (f.includes('SAFETY CAR') || cat.includes('SAFETY CAR') || msg.message?.includes('SAFETY CAR DEPLOYED')) return 'SC';
    if (f.includes('VIRTUAL') || msg.message?.includes('VIRTUAL SAFETY CAR')) return 'VSC';
    if (f === 'YELLOW' || f === 'DOUBLE YELLOW') return 'YELLOW';
    if (f === 'GREEN' || f === 'CLEAR' || f === 'CHEQUERED') return 'GREEN';
  }
  return 'GREEN';
}

export function raceReducer(state: RaceState, action: RaceAction): RaceState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: true, error: null, loadingStep: action.step, loadingProgress: action.progress };
    case 'SET_ERROR': return { ...state, loading: false, error: action.error };
    case 'SESSION_LOADED': return { ...state, loading: false, error: null, ...action.state };
    case 'TICK': {
      const { virtualTime, positions, intervals, weather, raceControl, stints, currentLaps, telemetry } = action;
      const latestByDriver = new Map<number, PositionEntry>();
      positions.forEach(p => latestByDriver.set(p.driver_number, p));
      const latestIntervals = new Map<number, IntervalEntry>();
      intervals.forEach(i => latestIntervals.set(i.driver_number, i));
      const leaderboard: LeaderboardEntry[] = [];
      latestByDriver.forEach((pos, driverNum) => {
        const driver = state.drivers.get(driverNum);
        if (!driver) return;
        const intervalEntry = latestIntervals.get(driverNum);
        const currentStint = stints.get(driverNum) ?? null;
        const currentLap = currentLaps?.get(driverNum) ?? 0;
        
        let lapsOnTyre = 0;
        if (currentStint) {
          const stintAge = Math.max(0, currentLap - currentStint.lap_start);
          lapsOnTyre = (currentStint.tyre_age_at_start ?? 0) + stintAge;
        }

        leaderboard.push({
          position: pos.position, driver,
          gap_to_leader: intervalEntry?.gap_to_leader ?? (pos.position === 1 ? 'LEADER' : '--'),
          interval: intervalEntry?.interval ?? '--',
          current_stint: currentStint, laps_on_tyre: lapsOnTyre, current_lap: currentLap,
        });
      });
      leaderboard.sort((a, b) => a.position - b.position);
      const flagStatus = deriveFlagStatus(raceControl);
      const latestRC = raceControl[raceControl.length - 1];

      return {
        ...state, virtualTime, leaderboard,
        weather: weather ?? state.weather, raceControlMessages: raceControl,
        flagStatus, pitLaneOpen: flagStatus !== 'RED', latestRCMessage: latestRC?.message ?? state.latestRCMessage,
        currentStints: stints, telemetry,
      };
    }
    case 'UPDATE_MAP_POSITIONS': return { ...state, driverMapPositions: action.positions };
    case 'SET_PLAYING': return { ...state, isPlaying: action.playing };
    case 'SET_SPEED': return { ...state, replaySpeed: action.speed };
    case 'SELECT_DRIVER': return { ...state, selectedDriverNumber: action.driverNumber };
    case 'RESET': return { ...initialState };
    default: return state;
  }
}
