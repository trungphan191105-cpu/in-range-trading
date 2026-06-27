// "In Range We Play" eye logo — SVG icon component
export default function EyeLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer eye shape */}
      <path
        d="M4 20C4 20 10 8 20 8C30 8 36 20 36 20C36 20 30 32 20 32C10 32 4 20 4 20Z"
        stroke="url(#eyeGrad)" strokeWidth="2" fill="none" strokeLinejoin="round"
      />
      {/* Iris */}
      <circle cx="20" cy="20" r="6.5" stroke="url(#eyeGrad)" strokeWidth="2" fill="rgba(56,189,248,0.08)" />
      {/* Pupil */}
      <circle cx="20" cy="20" r="3" fill="url(#eyeGrad)" />
      {/* Range lines — left */}
      <line x1="4" y1="20" x2="10" y2="20" stroke="url(#eyeGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Range lines — right */}
      <line x1="30" y1="20" x2="36" y2="20" stroke="url(#eyeGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Shine */}
      <circle cx="23" cy="17" r="1.5" fill="white" opacity="0.5" />
      <defs>
        <linearGradient id="eyeGrad" x1="4" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
