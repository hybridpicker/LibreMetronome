/*
 * LibreMetronome - Open Source Metronome
 *
 * This file is part of LibreMetronome.
 *
 * LibreMetronome is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * LibreMetronome is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import InfoOverlay from './components/InfoOverlay';
import AdvancedMetronomeWithCircle from './components/AdvancedMetronomeWithCircle';
import GridModeMetronome from './components/GridModeMetronome';
import useKeyboardShortcuts from './hooks/KeyboardShortcuts';

const TEMPO_MIN = 15;
const TEMPO_MAX = 240;

function App() {
  // Default mode is now "circle" to always display Circle Mode first.
  const [mode, setMode] = useState("circle");

  // Metronome parameters
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  // Default swing is now set to 0
  const [swing, setSwing] = useState(0);
  // Default volume is now set to 50% (0.5)
  const [volume, setVolume] = useState(0.5);

  // Toggle play/pause state
  const togglePlay = () => setIsPaused(prev => !prev);

  // Lift accent state to the parent.
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  // If subdivisions change, reset accent state.
  useEffect(() => {
    setAccents(Array.from({ length: subdivisions }, (_, i) => i === 0));
  }, [subdivisions]);

  // Toggle accent for a given beat index (except the first beat)
  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = !newAccents[index];
      return newAccents;
    });
  };

  // State for the InfoOverlay visibility
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const toggleInfoOverlay = () => setIsInfoVisible(prev => !prev);

  // Example Tap Tempo handler (could be linked to metronome logic)
  const handleTapTempo = () => {
    console.log("Tap Tempo triggered via keyboard");
  };

  // Integrate global keyboard shortcuts using our custom hook
  useKeyboardShortcuts({
    onTogglePlayPause: togglePlay,
    onTapTempo: handleTapTempo,
    onSetSubdivisions: setSubdivisions,
    onIncreaseTempo: () => setTempo(prev => Math.min(prev + 5, TEMPO_MAX)),
    onDecreaseTempo: () => setTempo(prev => Math.max(prev - 5, TEMPO_MIN)),
    onSwitchToAnalog: () => setMode("analog"),
    onSwitchToCircle: () => setMode("circle"),
    onSwitchToGrid: () => setMode("grid"),
    onToggleInfoOverlay: toggleInfoOverlay,
  });

  return (
    <div className="app-container">
      <InfoOverlay isVisible={isInfoVisible} onClose={toggleInfoOverlay} />
      <Header />

      {/* Mode selection buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => setMode("analog")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "analog" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Analog Mode
        </button>
        <button
          onClick={() => setMode("circle")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "circle" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Circle Mode
        </button>
        <button
          onClick={() => setMode("grid")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: mode === "grid" ? "#0ba3b2" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Grid Mode
        </button>
      </div>

      {/* Render metronome based on selected mode */}
      {mode === "analog" && (
        <AdvancedMetronomeWithCircle
          tempo={tempo}
          setTempo={setTempo}
          subdivisions={subdivisions}
          setSubdivisions={setSubdivisions}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          swing={swing}
          setSwing={setSwing}
          volume={volume}
          setVolume={setVolume}
          togglePlay={togglePlay}
          analogMode={true}
        />
      )}
      {mode === "circle" && (
        <AdvancedMetronomeWithCircle
          tempo={tempo}
          setTempo={setTempo}
          subdivisions={subdivisions}
          setSubdivisions={setSubdivisions}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          swing={swing}
          setSwing={setSwing}
          volume={volume}
          setVolume={setVolume}
          togglePlay={togglePlay}
          analogMode={false}
          accents={accents} 
          toggleAccent={toggleAccent} 
        />
      )}
      {mode === "grid" && (
        <GridModeMetronome
          tempo={tempo}
          setTempo={setTempo}
          subdivisions={subdivisions}
          setSubdivisions={setSubdivisions}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          swing={swing}
          setSwing={setSwing}
          volume={volume}
          setVolume={setVolume}
          togglePlay={togglePlay}
          analogMode={false}
          gridMode={true}
          accents={accents}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
