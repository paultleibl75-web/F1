// c:\Users\pault\Desktop\F1\src\App.tsx
import React from 'react';
import { RaceProvider, useRaceState, useRace } from './context/RaceContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header/Header';
import Leaderboard from './components/Leaderboard/Leaderboard';
import TrackMap from './components/TrackMap/TrackMap';
import WeatherPanel from './components/WeatherPanel/WeatherPanel';
import DriverCamPanel from './components/DriverCam/DriverCamPanel';
import RaceControlPanel from './components/RaceControl/RaceControlPanel';
import TelemetryCard from './components/TelemetryCard/TelemetryCard';
import SessionSelector from './components/SessionSelector/SessionSelector';
import './styles/index.css';

function LoadingOverlay() {
  const { loadingStep, loadingProgress } = useRaceState();
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-title">🏎 PITWALL</div>
        <div className="loading-step">{loadingStep}</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${loadingProgress}%` }} />
        </div>
      </div>
    </div>
  );
}

function ErrorOverlay({ onReset }: { onReset: () => void }) {
  const { error } = useRaceState();
  return (
    <div className="error-overlay">
      <div className="error-box">
        <div className="error-box__title">⚠ CONNECTION ERROR</div>
        <div className="error-box__msg">{error}</div>
        <button className="error-box__btn" onClick={onReset}>← BACK TO SESSION SELECT</button>
      </div>
    </div>
  );
}

function Dashboard() {
  const state = useRaceState();
  const { dispatch } = useRace();
  const showSelector = !state.sessionName && !state.loading && !state.error;

  return (
    <>
      {showSelector && <SessionSelector />}
      {state.loading && <LoadingOverlay />}
      {state.error && <ErrorOverlay onReset={() => dispatch({ type: 'RESET' })} />}

      <div className="pitwall-app">
        {/* Header */}
        <Header />

        {/* Col 1: Leaderboard (Full height) */}
        <div className="col-left">
          <Leaderboard />
        </div>

        {/* Col 2: Center Column (Track Map enlarged on top, compact Weather on bottom) */}
        <div className="col-center">
          <TrackMap />
          <WeatherPanel />
        </div>

        {/* Col 3 & 4 Top: Driver Live-Cam Window (16:9) */}
        <div className="col-cam">
          <DriverCamPanel />
        </div>

        {/* Col 3 Bottom: Race Control (Under live cam, left side) */}
        <div className="col-rc">
          <RaceControlPanel />
        </div>

        {/* Col 4 Bottom: Telemetry (Under live cam, right side) */}
        <div className="col-telem">
          <TelemetryCard />
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <RaceProvider>
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </RaceProvider>
  );
}
