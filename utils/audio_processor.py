# utils/audio_processor.py

import sounddevice as sd
import numpy as np

class AudioProcessor:
    def __init__(self, samplerate=44100, threshold=0.3):
        """
        Initializes the AudioProcessor.

        Args:
            samplerate (int): Sampling rate for audio processing.
            threshold (float): Threshold to detect peaks in the signal.
        """
        self.samplerate = samplerate
        self.threshold = threshold

    def detect_peaks(self, signal):
        """Detects peaks in the audio signal."""
        signal = signal / np.max(np.abs(signal))  # Normalize the signal
        peaks = []
        last_peak_time = 0  # Zeitpunkt des letzten validen Peaks
        min_peak_distance = int(self.samplerate * 0.2)  # Minimum Zeitabstand (in Samples)

        for i in range(1, len(signal) - 1):
            if signal[i] > self.threshold and signal[i] > signal[i - 1] and signal[i] > signal[i + 1]:
                # Prüfen, ob der Peak weit genug vom letzten Peak entfernt ist
                if len(peaks) == 0 or (i - last_peak_time) > min_peak_distance:
                    peaks.append(i)
                    last_peak_time = i

        print(f"Detected {len(peaks)} peaks")
        if len(peaks) > 0:
            print(f"Peak positions: {peaks[:10]}")  # Show the first 10 peaks
        return peaks

    def calculate_bpm(self, peaks):
        """Calculates BPM based on the detected peaks."""
        if len(peaks) < 2:
            return 0  # Not enough peaks to calculate BPM

        intervals = np.diff(peaks) / self.samplerate
        print(f"Intervals between peaks: {intervals[:10]}")  # Show first 10 intervals

        avg_interval = np.mean(intervals)
        bpm = 60 / avg_interval
        bpm = max(30, min(bpm, 300))  # Limit BPM to 30–300
        return bpm

    def record_audio(self, duration):
        """Records audio for a specified duration."""
        print("Recording audio... Clap or tap to the beat!")
        audio = sd.rec(int(self.samplerate * duration), samplerate=self.samplerate, channels=1, dtype='float32')
        sd.wait()
        print(f"Recorded audio signal (first 10 samples): {audio[:10]}")  # Debug: Signal überprüfen
        return audio.flatten()

    def get_bpm_from_audio(self, duration=5):
        """Records audio and calculates BPM."""
        signal = self.record_audio(duration)
        peaks = self.detect_peaks(signal)
        bpm = self.calculate_bpm(peaks)
        return bpm

    def stop_metronome_during_detection(self, metronome):
        """Stops the metronome while BPM detection is active."""
        print("Stopping metronome for BPM detection...")
        metronome.pause(True)
