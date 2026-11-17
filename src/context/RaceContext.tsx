import React, {
  createContext, useContext, useReducer, useRef, useCallback, useEffect, useState
} from 'react';
import { raceReducer, RaceState, RaceAction, initialState } from '../engine/raceState';
import { ReplayEngine } from '../engine/replayEngine';
import { loadSession } from '../api/sessionLoader';
import { EngineContext } from './EngineContext';

// ─── Context Types ────────────────────────────────────────────────────────────

interface RaceContextValue {
  state: RaceState;
  dispatch: React.Dispatch<RaceAction>;
  loadSessionData: (sessionKey: number) => Promise<void>;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
  selectDriver: (driverNumber: number | null) => void;
  addTelemetry: (driverNumber: number, carData: import('../api/endpoints').CarDataEntry[]) => void;
}

const RaceContext = createContext<RaceContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(raceReducer, initialState);
  const engineRef = useRef<ReplayEngine | null>(null);
  const [engine, setEngine] = useState<ReplayEngine | null>(null);

  const loadSessionData = useCallback(async (sessionKey: number) => {
    // Destroy any existing engine
    engineRef.current?.pause();
    engineRef.current = null;

    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_LOADING', step: 'Connecting to OpenF1…', progress: 0 });

    try {
      const sessionData = await loadSession(sessionKey, ({ step, done, total }) => {
        dispatch({ type: 'SET_LOADING', step, progress: Math.round((done / total) * 80) });
      });

      dispatch({
        type: 'SESSION_LOADED',
        state: {
          sessionKey,
          sessionName: `${sessionData.session.country_name} ${sessionData.session.session_name}`,
          sessionStart: sessionData.session.date_start,
          sessionEnd: sessionData.session.date_end,
          circuitName: sessionData.session.circuit_short_name,
          country: sessionData.session.country_name,
          drivers: sessionData.drivers,
          loading: false,
        },
      });

      // Build the replay engine
      const newEngine = new ReplayEngine();
      engineRef.current = newEngine;
      setEngine(newEngine);

      dispatch({ type: 'SET_LOADING', step: 'Initializing engine…', progress: 85 });
      newEngine.init(sessionData, dispatch);
      dispatch({ type: 'SET_LOADING', step: 'Ready!', progress: 100 });

      // Auto-select first driver
      if (sessionData.drivers.size > 0) {
        const firstNum: number | null = sessionData.drivers.keys().next().value ?? null;
        dispatch({ type: 'SELECT_DRIVER', driverNumber: firstNum });
      }

      // Small delay then clear loading
      setTimeout(() => {
        dispatch({ type: 'SESSION_LOADED', state: { loading: false } });
      }, 600);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, []);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const setSpeed = useCallback((speed: 1 | 2 | 5) => {
    engineRef.current?.setSpeed(speed);
    dispatch({ type: 'SET_SPEED', speed });
  }, []);
  const selectDriver = useCallback((driverNumber: number | null) => {
    dispatch({ type: 'SELECT_DRIVER', driverNumber });
  }, []);
  const addTelemetry = useCallback((driverNumber: number, carData: import('../api/endpoints').CarDataEntry[]) => {
    engineRef.current?.addTelemetry(carData);
    dispatch({ type: 'UPDATE_TELEMETRY', driverNumber, carData });
  }, []);

  useEffect(() => {
    return () => { engineRef.current?.pause(); };
  }, []);

  return (
    <EngineContext.Provider value={engine}>
      <RaceContext.Provider value={{ state, dispatch, loadSessionData, play, pause, setSpeed, selectDriver, addTelemetry }}>
        {children}
      </RaceContext.Provider>
    </EngineContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRace(): RaceContextValue {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error('useRace must be used inside <RaceProvider>');
  return ctx;
}

export function useRaceState(): RaceState {
  return useRace().state;
}
