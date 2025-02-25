// File: src/components/metronome/SubdivisionSelector.js
import React from 'react';
import subdivision1 from '../../assets/svg/subdivision-1.svg';
import subdivision1Active from '../../assets/svg/subdivision-1Active.svg';
// (Similarly import the rest of the subdivision icons.)
const icons = [
  { inactive: subdivision1, active: subdivision1Active },
  // ... add entries for subdivisions 2–9
];

const SubdivisionSelector = ({ subdivisions, onSelect }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
      {icons.map((icon, idx) => {
        const subVal = idx + 1;
        const isActive = subVal === subdivisions;
        return (
          <img
            key={subVal}
            src={isActive ? icon.active : icon.inactive}
            alt={`Subdivision ${subVal}`}
            onClick={() => onSelect(subVal)}
            style={{ cursor: 'pointer', width: '36px', height: '36px', margin: '0 3px' }}
          />
        );
      })}
    </div>
  );
};

export default SubdivisionSelector;
