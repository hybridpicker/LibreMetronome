import React from 'react';
import subdivision1 from '../../../assets/svg/subdivision-1.svg';
import subdivision1Active from '../../../assets/svg/subdivision-1Active.svg';
import subdivision2 from '../../../assets/svg/subdivision-2.svg';
import subdivision2Active from '../../../assets/svg/subdivision-2Active.svg';
import subdivision3 from '../../../assets/svg/subdivision-3.svg';
import subdivision3Active from '../../../assets/svg/subdivision-3-Active.svg';
import subdivision4 from '../../../assets/svg/subdivision-4.svg';
import subdivision4Active from '../../../assets/svg/subdivision-4Active.svg';
import subdivision5 from '../../../assets/svg/subdivision-5.svg';
import subdivision5Active from '../../../assets/svg/subdivision-5Active.svg';
import subdivision6 from '../../../assets/svg/subdivision-6.svg';
import subdivision6Active from '../../../assets/svg/subdivision-6Active.svg';
import subdivision7 from '../../../assets/svg/subdivision-7.svg';
import subdivision7Active from '../../../assets/svg/subdivision-7Active.svg';
import subdivision8 from '../../../assets/svg/subdivision-8.svg';
import subdivision8Active from '../../../assets/svg/subdivision-8Active.svg';
import subdivision9 from '../../../assets/svg/subdivision-9.svg';
import subdivision9Active from '../../../assets/svg/subdivision-9Active.svg';

import './SubdivisionSelector.css';

const icons = [
  { inactive: subdivision1, active: subdivision1Active },
  { inactive: subdivision2, active: subdivision2Active },
  { inactive: subdivision3, active: subdivision3Active },
  { inactive: subdivision4, active: subdivision4Active },
  { inactive: subdivision5, active: subdivision5Active },
  { inactive: subdivision6, active: subdivision6Active },
  { inactive: subdivision7, active: subdivision7Active },
  { inactive: subdivision8, active: subdivision8Active },
  { inactive: subdivision9, active: subdivision9Active }
];

const SubdivisionSelector = ({ subdivisions, onSelect }) => {
  return (
    <div className="subdivision-container">
      {icons.map((icon, idx) => {
        const subVal = idx + 1;
        const isActive = subVal === subdivisions;
        return (
          <img
            key={subVal}
            src={isActive ? icon.active : icon.inactive}
            alt={`Subdivision ${subVal}`}
            onClick={() => onSelect(subVal)}
            className="subdivision-button"
            style={{
              cursor: "pointer",
              width: "36px",
              height: "36px",
              margin: "0 3px",
              transition: "transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
              transform: isActive ? "scale(1.1)" : "scale(1)",
              filter: isActive ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none"
            }}
          />
        );
      })}
    </div>
  );
};

export default SubdivisionSelector;