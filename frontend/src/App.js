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
  // Mode selection: "analog", "circle" or "grid"
  const [mode, setMode] = useState("circle");

  // Metronom-Parameter
  const [tempo, setTempo] = useState(120);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [swing, setSwing] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const togglePlay = () => setIsPaused(prev => !prev);

  // Einheitlicher Akzentstatus im Elternteil.
  // Der erste Beat ist immer akzentuiert (true); weitere Beats starten mit false.
  const [accents, setAccents] = useState(
    Array.from({ length: subdivisions }, (_, i) => i === 0)
  );
  useEffect(() => {
    // Reset, wenn sich subdivisions ändern.
    setAccents(Array.from({ length: subdivisions }, (_, i) => i === 0));
  }, [subdivisions]);
  const toggleAccent = (index) => {
    if (index === 0) return;
    setAccents(prev => {
      const newAccents = [...prev];
      newAccents[index] = !newAccents[index];
      return newAccents;
    });
  };

  // InfoOverlay-Zustand
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const toggleInfoOverlay = () => setIsInfoVisible(prev => !prev);

  // Beispiel Tap Tempo-Handler (kann mit der Metronom-Logik verknüpft werden)
  const handleTapTempo = () => {
    console.log("Tap Tempo triggered via keyboard");
  };

  // Globale Tastaturkürzel
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

      {/* Mode-Auswahl */}
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

      {/* Rendern des Metronoms je nach ausgewähltem Modus */}
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
      {/* Kommentar vor dem Element – nicht inline! */}
      {mode === "grid" && (
        <>
          {/* New callback to sync accents */}
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
            updateAccents={setAccents}
          />
        </>
      )}

      <Footer />
    </div>
  );
}

export default App;
