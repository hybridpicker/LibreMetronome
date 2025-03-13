// src/components/Training/withMultiCircleTrainingContainer.js
import React, { useEffect } from 'react';
import MultiCircleTrainingActiveContainer from './MultiCircleTrainingActiveContainer';

/**
 * A specialized Higher-Order Component for Multi Circle Mode
 * This wrapper uses a MultiCircleTrainingActiveContainer specifically
 * designed to work with Multi Circle Mode's unique rhythm handling.
 */
const withMultiCircleTrainingContainer = (WrappedMetronome) => {
  return function WrappedWithMultiCircleTraining(props) {
    const {
      // Training-related props
      macroMode,
      speedMode,
      isSilencePhaseRef,
      measureCountRef,
      measuresUntilMute,
      muteMeasureCountRef,
      muteDurationMeasures,
      muteProbability,
      tempoIncreasePercent,
      measuresUntilSpeedUp,
      ...rest
    } = props;

    // Make isSilencePhaseRef globally available for all modes
    useEffect(() => {
      if (isSilencePhaseRef) {
        window.isSilencePhaseRef = isSilencePhaseRef;
      }
      
      return () => {
        // Cleanup global refs when component unmounts
        if (window.isSilencePhaseRef === isSilencePhaseRef) {
          delete window.isSilencePhaseRef;
        }
      };
    }, [isSilencePhaseRef]);

    // Set up automatic training updates for UI
    useEffect(() => {
      // For Multi Circle Mode, we'll dispatch measure updates on a regular interval
      // when training mode is active to keep the UI in sync
      if (macroMode !== 0 || speedMode !== 0) {
        const updateInterval = setInterval(() => {
          window.dispatchEvent(new CustomEvent('training-measure-update'));
        }, 500);
        
        return () => clearInterval(updateInterval);
      }
    }, [macroMode, speedMode]);

    return (
      <>
        <MultiCircleTrainingActiveContainer
          macroMode={macroMode}
          speedMode={speedMode}
          isSilencePhaseRef={isSilencePhaseRef}
          measureCountRef={measureCountRef}
          measuresUntilMute={measuresUntilMute}
          muteMeasureCountRef={muteMeasureCountRef}
          muteDurationMeasures={muteDurationMeasures}
          tempoIncreasePercent={tempoIncreasePercent}
          measuresUntilSpeedUp={measuresUntilSpeedUp}
        />
        {/* Render the wrapped Metronome with ALL training props */}
        <WrappedMetronome 
          macroMode={macroMode}
          speedMode={speedMode}
          isSilencePhaseRef={isSilencePhaseRef}
          measureCountRef={measureCountRef}
          measuresUntilMute={measuresUntilMute}
          muteMeasureCountRef={muteMeasureCountRef}
          muteDurationMeasures={muteDurationMeasures}
          muteProbability={muteProbability}
          tempoIncreasePercent={tempoIncreasePercent}
          measuresUntilSpeedUp={measuresUntilSpeedUp}
          {...rest} 
        />
      </>
    );
  };
};

export default withMultiCircleTrainingContainer;