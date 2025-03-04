// src/assets/svg/subdivisionIcons.js
import subdivision1 from './subdivision-1.svg';
import subdivision2 from './subdivision-2.svg';
import subdivision3 from './subdivision-3.svg';
import subdivision4 from './subdivision-4.svg';
import subdivision5 from './subdivision-5.svg';
import subdivision6 from './subdivision-6.svg';
import subdivision7 from './subdivision-7.svg';
import subdivision8 from './subdivision-8.svg';
import subdivision9 from './subdivision-9.svg';

import subdivision1Active from './subdivision-1Active.svg';
import subdivision2Active from './subdivision-2Active.svg';
import subdivision3Active from './subdivision-3-Active.svg';
import subdivision4Active from './subdivision-4Active.svg';
import subdivision5Active from './subdivision-5Active.svg';
import subdivision6Active from './subdivision-6Active.svg';
import subdivision7Active from './subdivision-7Active.svg';
import subdivision8Active from './subdivision-8Active.svg';
import subdivision9Active from './subdivision-9Active.svg';

export const subdivisionIcons = {
  subdivision1,
  subdivision2,
  subdivision3,
  subdivision4,
  subdivision5,
  subdivision6,
  subdivision7,
  subdivision8,
  subdivision9,
  subdivision1Active,
  subdivision2Active,
  subdivision3Active,
  subdivision4Active,
  subdivision5Active,
  subdivision6Active,
  subdivision7Active,
  subdivision8Active,
  subdivision9Active
};

// Helper function to get subdivision icon based on number and active state
export const getSubdivisionIcon = (number, isActive = false) => {
  if (number < 1 || number > 9) {
    return null;
  }
  
  const key = isActive 
    ? `subdivision${number}Active` 
    : `subdivision${number}`;
  
  return subdivisionIcons[key];
};