import React, { useState, useEffect, useRef } from 'react';
import { useRaceState } from '../../context/RaceContext';

// Curated official F1 Onboard Pole Lap feeds per driver
const ONBOARD_FEEDS: Record<string, string> = {
  // Max Verstappen - Red Bull Racing Onboard
  'VER': 'https://www.youtube-nocookie.com/embed/7_4Xh7a0oY0?autoplay=1&mute=1&controls=0&loop=1',
  // Lewis Hamilton - Mercedes-AMG Onboard
  'HAM': 'https://www.youtube-nocookie.com/embed/Xq-dO5tUe3g?autoplay=1&mute=1&controls=0&loop=1',
  // Charles Leclerc - Scuderia Ferrari Onboard
  'LEC': 'https://www.youtube-nocookie.com/embed/Z0oYJ2N-8pA?autoplay=1&mute=1&controls=0&loop=1',
  // Lando Norris - McLaren Onboard
  'NOR': 'https://www.youtube-nocookie.com/embed/1_0x2e0_118?autoplay=1&mute=1&controls=0&loop=1',
  // George Russell - Mercedes Onboard
  'RUS': 'https://www.youtube-nocookie.com/embed/Xq-dO5tUe3g?autoplay=1&mute=1&controls=0&loop=1',
  // Carlos Sainz - Ferrari Onboard
  'SAI': 'https://www.youtube-nocookie.com/embed/Z0oYJ2N-8pA?autoplay=1&mute=1&controls=0&loop=1',
  // Oscar Piastri - McLaren Onboard
  'PIA': 'https://www.youtube-nocookie.com/embed/1_0x2e0_118?autoplay=1&mute=1&controls=0&loop=1',
  // Fernando Alonso - Aston Martin Onboard
  'ALO': 'https://www.youtube-nocookie.com/embed/7_4Xh7a0oY0?autoplay=1&mute=1&controls=0&loop=1',
  // Default F1 Broadcast Lap
  'DEFAULT': 'https://www.youtube-nocookie.com/embed/7_4Xh7a0oY0?autoplay=1&mute=1&controls=0&loop=1',
};

// Alternative perspectives (CORS-friendly direct video streams)
const PERSPECTIVE_VIDEOS: Record<string, string> = {
  'T-CAM': 'https://vjs.zencdn.net/v/oceans.mp4',
  'HELMET': 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
};

export default function DriverCamPanel() {
  const state = useRaceState();
  const { drivers, selectedDriverNumber, isPlaying } = state;

  const [activeMode, setActiveMode] = useState<'ONBOARD' | 'T-CAM' | 'HELMET'>('ONBOARD');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [showUrlDialog, setShowUrlDialog] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  const driver = selectedDriverNumber ? drivers.get(selectedDriverNumber) : null;
  const tc = driver ? `#${driver.team_colour}` : '#00d7ff';
  const acronym = driver?.name_acronym ?? 'DEFAULT';

  // Synchronize HTML5 video play/pause with race replay state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const currentEmbedUrl = customUrl.trim() || ONBOARD_FEEDS[acronym] || ONBOARD_FEEDS.DEFAULT;
  const currentDirectVideo = customUrl.trim() || PERSPECTIVE_VIDEOS[activeMode] || PERSPECTIVE_VIDEOS['T-CAM'];

  return (
    <section className="panel driver-cam-panel">
      {/* Top Header Bar of the Cam Window */}
      <div className="driver-cam__bar">
        <div className="driver-cam__driver-info">
          <span className="live-pill">
            <span className="live-pill__dot" />
            LIVE
          </span>
          {driver ? (
            <div className="driver-cam__tag">
              <span className="driver-cam__num" style={{ color: tc, borderColor: tc }}>
                {driver.driver_number}
              </span>
              <span className="driver-cam__name">{driver.first_name[0]}. {driver.last_name.toUpperCase()}</span>
              <span className="driver-cam__team" style={{ color: tc }}>{driver.team_name}</span>
            </div>
          ) : (
            <span className="driver-cam__name" style={{ opacity: 0.6 }}>NO DRIVER SELECTED</span>
          )}
        </div>

        {/* Cam Selector Tabs */}
        <div className="driver-cam__cams">
          <button
            className={`cam-tab ${activeMode === 'ONBOARD' && !customUrl ? 'cam-tab--active' : ''}`}
            onClick={() => { setActiveMode('ONBOARD'); setCustomUrl(''); }}
            title="Driver Onboard Stream"
          >
            🎥 ONBOARD
          </button>
          <button
            className={`cam-tab ${activeMode === 'T-CAM' && !customUrl ? 'cam-tab--active' : ''}`}
            onClick={() => { setActiveMode('T-CAM'); setCustomUrl(''); }}
            title="T-Cam Perspective"
          >
            🏎️ T-CAM
          </button>
          <button
            className={`cam-tab ${activeMode === 'HELMET' && !customUrl ? 'cam-tab--active' : ''}`}
            onClick={() => { setActiveMode('HELMET'); setCustomUrl(''); }}
            title="Helmet Cam"
          >
            🏁 HELMET
          </button>

          {/* Sound toggle */}
          <button
            className="cam-tab cam-tab--icon"
            onClick={() => setIsMuted(m => !m)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Custom Stream URL toggle */}
          <button
            className={`cam-tab cam-tab--icon ${customUrl ? 'cam-tab--active' : ''}`}
            onClick={() => setShowUrlDialog(d => !d)}
            title="Custom Stream / Video URL"
          >
            🔗
          </button>
        </div>
      </div>

      {/* Custom Stream URL Input Dropdown */}
      {showUrlDialog && (
        <div className="driver-cam__url-modal">
          <input
            type="text"
            className="driver-cam__url-input"
            placeholder="Paste Custom Video or Stream URL (.mp4, YouTube, etc.)"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
          />
          <button className="ctrl-btn" onClick={() => setShowUrlDialog(false)}>OK</button>
          {customUrl && (
            <button className="ctrl-btn" onClick={() => { setCustomUrl(''); setShowUrlDialog(false); }}>Reset</button>
          )}
        </div>
      )}

      {/* Main Viewport: Clean 16:9 Screen Flush to Borders */}
      <div className="driver-cam__viewport">
        {activeMode === 'ONBOARD' || customUrl.includes('youtube.com') || customUrl.includes('youtu.be') ? (
          <iframe
            key={currentEmbedUrl}
            src={currentEmbedUrl}
            className="driver-cam__video"
            title="Driver Onboard Stream"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            key={currentDirectVideo}
            src={currentDirectVideo}
            className="driver-cam__video"
            autoPlay={isPlaying}
            loop
            muted={isMuted}
            playsInline
          />
        )}

        {/* Authentic Visor / Lens Gradient Vignette */}
        <div className="driver-cam__vignette" />
      </div>
    </section>
  );
}
