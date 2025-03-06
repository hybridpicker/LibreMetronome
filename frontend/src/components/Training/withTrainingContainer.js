// src/components/Training/withTrainingContainer.js
import React from 'react';
import TrainingActiveContainer from './TrainingActiveContainer';

/**
 * A Higher-Order Component that injects the <TrainingActiveContainer/>
 * into any metronome component without duplicating code in each mode.
 * 
 * Usage:
 *   export default withTrainingContainer(YourMetronomeComponent);
 */
const withTrainingContainer = (WrappedMetronome) => {
  return function WrappedWithTraining(props) {
    const {
      // Pass in the following training-related props from App.js or wherever:
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

    // Make isSilencePhaseRef globally available to all metronome modes
    // This ensures all metronome modes can check the silence state
    React.useEffect(() => {
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

    // If macroMode===0 and speedMode===0, the TrainingActiveContainer
    // will simply return null, so it is safe to render always:
    return (
      <>
        <TrainingActiveContainer
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
        {/* Render the wrapped Metronome mode below with ALL training props */}
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

export default withTrainingContainer;