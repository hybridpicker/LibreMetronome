// src/components/metronome/Score/tempoWord.js
// The Italian tempo word that goes with a tempo in quarter notes per minute.
// Fixed table (bands follow the common Maelzel ranges); the upper bound is
// exclusive, so 120 is already Allegro.
const BANDS = [
  [40, 'Grave'],
  [60, 'Largo'],
  [66, 'Larghetto'],
  [76, 'Adagio'],
  [108, 'Andante'],
  [120, 'Moderato'],
  [156, 'Allegro'],
  [176, 'Vivace'],
  [200, 'Presto']
];

export const tempoWord = (bpm) => {
  const value = Number(bpm);
  for (const [upper, word] of BANDS) {
    if (value < upper) return word;
  }
  return 'Prestissimo';
};

export default tempoWord;
