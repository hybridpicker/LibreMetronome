#!/usr/bin/env python3
"""Synthesizes the bundled metronome clicks in public/assets/audio/.

The sounds imitate a classic mechanical metronome:

- normal beat: a short, dry, high escapement tick
- accent: the same tick, a minor third higher and slightly stronger
- first beat: the same tick, a fourth higher, with a short metallic ring

A tick is a short noise impulse, struck twice about 2 ms apart like the two
impacts of an escapement, that excites a few damped resonances of a small
case. Driving resonators with noise (instead of summing pure sines) gives the
dry, non-tonal character of a mechanical tick. Accent and first beat reuse the
normal tick, including its noise impulse, so all beats sound like one
instrument and differ only in pitch, level and the first beat's brief ring.

Usage (from frontend/):
    python3 scripts/generate-click-sounds.py

Writes click_new.wav, click_new_accent.wav and click_new_first.wav (48 kHz,
16-bit mono) and, when `lame` is installed, matching .mp3 files. The output is
deterministic. Every sound starts at its first sample so playback stays on time.
"""

import math
import random
import shutil
import struct
import subprocess
import wave
from pathlib import Path

SAMPLE_RATE = 48000
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets" / "audio"

# Case resonances: (frequency Hz, relative amplitude, decay time constant s).
NORMAL_TICK = [(2350, 1.0, 0.0045), (3650, 0.7, 0.0032), (5300, 0.45, 0.0022), (7600, 0.25, 0.0014)]
ACCENT_PITCH = 2 ** (3 / 12)  # minor third
FIRST_PITCH = 4 / 3  # perfect fourth
# Short ring of the first beat at its main resonance; the detuned twin adds a
# hint of metallic shimmer. The ring fades within about 0.2 s.
FIRST_RING = [(1.0, 1.0, 0.045), (1.002, 0.5, 0.040), (2.38, 0.25, 0.020)]
FIRST_RING_LEVEL = 0.3


def transposed(modes, factor):
    return [(frequency * factor, amplitude, decay) for frequency, amplitude, decay in modes]


def excitation(frames, rng, strikes=((0.0, 1.0), (0.0021, 0.45))):
    """Noise impulses (about 0.6 ms each) at the given times and levels."""
    signal = [0.0] * frames
    for start, level in strikes:
        first = int(start * SAMPLE_RATE)
        for n in range(first, min(frames, first + int(0.0025 * SAMPLE_RATE))):
            t = (n - first) / SAMPLE_RATE
            signal[n] += level * rng.uniform(-1, 1) * math.exp(-t / 0.0006)
    return signal


def resonate(source, frequency, decay):
    """Two-pole resonator with the given decay time constant."""
    r = math.exp(-1 / (decay * SAMPLE_RATE))
    c1 = 2 * r * math.cos(2 * math.pi * frequency / SAMPLE_RATE)
    c2 = -r * r
    gain = 1 - r  # keeps resonators of different bandwidths comparable
    y1 = y2 = 0.0
    output = []
    for x in source:
        y = gain * x + c1 * y1 + c2 * y2
        output.append(y)
        y1, y2 = y, y1
    return output


def tick(frames, modes, seed, transient=0.25):
    rng = random.Random(seed)
    source = excitation(frames, rng)
    mix = [transient * s for s in source]  # direct snap for crispness
    for frequency, amplitude, decay in modes:
        for n, value in enumerate(resonate(source, frequency, decay)):
            mix[n] += amplitude * value * 40
    return mix


def ring(frames, base_frequency):
    partials = [(base_frequency * ratio, a, tau) for ratio, a, tau in FIRST_RING]
    return [
        sum(a * math.exp(-(n / SAMPLE_RATE) / tau) * math.sin(2 * math.pi * f * n / SAMPLE_RATE) for f, a, tau in partials)
        for n in range(frames)
    ]


# Loudness targets as RMS over the first 50 ms: accent about +1.5 dB and the
# first beat about +3 dB above a normal beat, so the bar structure is audible
# without the downbeat standing out from the instrument.
LEVELS = {"normal": 0.150, "accent": 0.178, "first": 0.212}
CEILING = 0.98
# Overall level boost applied after the character-shaping stage above. A
# transparent peak limiter keeps it below the ceiling without changing timbre.
OUTPUT_GAIN_DB = 2.5


def rms(samples, seconds=0.05):
    window = samples[: int(seconds * SAMPLE_RATE)]
    return math.sqrt(sum(s * s for s in window) / len(window))


def finish(samples, level):
    """Removes DC, fades the end, sets the loudness and soft-limits peaks.

    The limiter only touches the first strike of a tick; tanh saturation
    there sounds like a harder impact rather than distortion.
    """
    mean = sum(samples) / len(samples)
    samples = [s - mean for s in samples]
    fade = int(0.01 * SAMPLE_RATE)
    for i in range(fade):
        samples[-1 - i] *= i / fade
    gain = level / rms(samples)
    for _ in range(6):  # limiting lowers the RMS slightly; converge on it
        limited = [CEILING * math.tanh(s * gain / CEILING) for s in samples]
        gain *= level / rms(limited)
    return master(limited, level * 10 ** (OUTPUT_GAIN_DB / 20))


def master(samples, level):
    """Raises the sound to `level` (RMS) through a transparent peak limiter.

    The gain curve is a running minimum of the required reduction, smoothed
    by a moving average over the same window. Both span 1 ms, so the curve
    never exceeds the reduction any sample needs and only the first strike's
    peak is lowered for about a millisecond, without waveshaping distortion.
    """
    half = int(0.0005 * SAMPLE_RATE)
    window = 2 * half + 1

    def limit(boosted):
        required = [min(1.0, CEILING / abs(s)) if s else 1.0 for s in boosted]
        held = [min(required[max(0, i - half): i + half + 1]) for i in range(len(required))]
        smoothed = []
        for i in range(len(held)):
            span = held[max(0, i - half): i + half + 1]
            smoothed.append(sum(span) / len(span) if len(span) == window else min(span))
        return [s * g for s, g in zip(boosted, smoothed)]

    gain = level / rms(samples)
    for _ in range(8):  # limiting lowers the RMS; converge on the target
        result = limit([s * gain for s in samples])
        gain *= level / rms(result)
    return result


def write_wav(path, samples):
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(b"".join(struct.pack("<h", round(s * 32767)) for s in samples))


def main():
    def frames(seconds):
        return int(seconds * SAMPLE_RATE)

    normal = finish(tick(frames(0.06), NORMAL_TICK, seed=1), LEVELS["normal"])
    accent = finish(tick(frames(0.06), transposed(NORMAL_TICK, ACCENT_PITCH), seed=1), LEVELS["accent"])

    first_modes = transposed(NORMAL_TICK, FIRST_PITCH)
    first_tick = tick(frames(0.2), first_modes, seed=1)
    first_ring = ring(frames(0.2), first_modes[0][0])
    tick_peak = max(abs(s) for s in first_tick)
    ring_peak = max(abs(s) for s in first_ring)
    first = finish(
        [t / tick_peak + FIRST_RING_LEVEL * r / ring_peak for t, r in zip(first_tick, first_ring)],
        LEVELS["first"],
    )

    lame = shutil.which("lame")
    for name, samples in (("click_new", normal), ("click_new_accent", accent), ("click_new_first", first)):
        wav_path = OUTPUT_DIR / f"{name}.wav"
        write_wav(wav_path, samples)
        if lame:
            subprocess.run(
                [lame, "--quiet", "-b", "128", "--resample", "48", str(wav_path), str(OUTPUT_DIR / f"{name}.mp3")],
                check=True,
            )
        peak = max(abs(s) for s in samples)
        print(f"{name}: {len(samples) / SAMPLE_RATE * 1000:.0f} ms, RMS {rms(samples):.3f}, peak {peak:.2f}")
    if not lame:
        print("lame not found: .mp3 files were not updated")


if __name__ == "__main__":
    main()
