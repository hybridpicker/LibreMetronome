import React from 'react';

/**
 * Small interface symbols that follow the same rounded, two-pixel outline
 * language as the existing accessibility and menu SVGs.
 */
const paths = {
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  accessibility: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M4.5 9 12 10.5 19.5 9M12 10.5V15M12 15l-4 6M12 15l4 6" />
    </>
  ),
  training: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  support: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  silence: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="m18 9-5 6M13 9l5 6" />
    </>
  ),
  sound: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  speed: (
    <>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M9 2h6M12 5v2M12 13l3-2" />
    </>
  ),
  tip: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8.5 15.5A7 7 0 1 1 15.5 15.5C14.6 16.1 14 17 14 18h-4c0-1-.6-1.9-1.5-2.5Z" />
    </>
  ),
  general: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  usage: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4V8Z" />
    </>
  ),
  features: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3Z" />,
  shortcuts: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M11 9h.01M15 9h.01M7 13h10M9 16h6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  add: <path d="M12 5v14M5 12h14" />,
  remove: <path d="M5 12h14" />,
  music: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  mobile: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 18h4" />
    </>
  ),
  sync: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 8A7 7 0 0 1 18.5 6.5L20 8M4 16l1.5 1.5A7 7 0 0 0 17.9 16" />
    </>
  )
};

const InterfaceIcon = ({ name, className = '', size = 20, title }) => (
  <svg
    className={`interface-icon ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
  >
    {title && <title>{title}</title>}
    {paths[name]}
  </svg>
);

export default InterfaceIcon;
