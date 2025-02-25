// File: src/components/metronome/CircleMetronome.js
import React from 'react';
import BaseMetronome from './BaseMetronome';
import firstBeat from '../../assets/svg/firstBeat.svg';
import firstBeatActive from '../../assets/svg/firstBeatActive.svg';
import normalBeat from '../../assets/svg/normalBeat.svg';
import normalBeatActive from '../../assets/svg/normalBeatActive.svg';
import accentedBeat from '../../assets/svg/accentedBeat.svg';
import accentedBeatActive from '../../assets/svg/accentedBeatActive.svg';
import playIcon from '../../assets/svg/play.svg';
import pauseIcon from '../../assets/svg/pause.svg';
import AnalogMetronomeCanvas from './AnalogMetronomeCanvas';

const CircleMetronome = (props) => {
  // Choose the proper beat icon for a given beat index and state.
  const getBeatIcon = (index, isActive) => {
    if (props.analogMode) return normalBeat;
    if (index === 0) return isActive ? firstBeatActive : firstBeat;
    const state = props.accents[index];
    if (state === 2) return isActive ? accentedBeatActive : accentedBeat;
    return isActive ? normalBeatActive : normalBeat;
  };

  return (
    <BaseMetronome {...props}>
      {({ beatData, containerSize, radius, logic }) => (
        <>
          {props.analogMode ? (
            <AnalogMetronomeCanvas
              width={containerSize}
              height={containerSize}
              isPaused={props.isPaused}
              audioCtxCurrentTime={() => (logic.audioCtx ? logic.audioCtx.currentTime : 0)}
              currentSubStartTime={() => logic.currentSubStartRef.current}
              currentSubInterval={() => logic.currentSubIntervalRef.current}
              currentSubIndex={logic.currentSubdivision}
            />
          ) : (
            beatData.map((bd) => (
              <img
                key={bd.i}
                src={getBeatIcon(bd.i, bd.isActive)}
                alt={`Beat ${bd.i}`}
                className="beat-icon"
                onClick={() => { props.toggleAccent(bd.i); }}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${bd.xPos}px - 12px)`,
                  top: `calc(50% + ${bd.yPos}px - 12px)`,
                  opacity: props.accents[bd.i] === 0 ? 0.3 : 1
                }}
              />
            ))
          )}
          {/* Render a single play/pause button overlay */}
          <button
            onClick={props.togglePlay}
            className="play-pause-button-overlay"
            style={{
              position: 'absolute',
              left: '50%',
              top: props.analogMode ? '85%' : '50%',
              transform: 'translate(-50%, -50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10
            }}
            aria-label="Toggle play/pause"
          >
            <img
              src={props.isPaused ? playIcon : pauseIcon}
              alt={props.isPaused ? 'Play' : 'Pause'}
              style={{ width: '36px', height: '36px', objectFit: 'contain' }}
            />
          </button>
        </>
      )}
    </BaseMetronome>
  );
};

export default CircleMetronome;
