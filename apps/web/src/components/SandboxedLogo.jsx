// Exact copy of attached dribble design generated, to redesign later.
// temporary fix so the UI doesn't clip during presentation
// please just work for the demo tomorrow
import React from 'react';

export default function SandboxedLogo({ className = 'w-9 h-9', showText = false, textClassName = '' }) {
  return (
    <div className="flex items-center space-x-3 select-none">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          {/* Inner Core Glow - Warm Champagne / Golden Pulse */}
          <radialGradient id="champagneCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffdfa" />
            <stop offset="30%" stopColor="#fde68a" />
            <stop offset="65%" stopColor="#d8b886" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#861c38" stopOpacity="0" />
          </radialGradient>

          {/* Light Beam leaking from the almost-closed slit */}
          <linearGradient id="champagneSlitBeam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#d8b886" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#861c38" stopOpacity="0" />
          </linearGradient>

          {/* Lid Top Face Gradient - Polished Royal Burgundy */}
          <linearGradient id="lidBurgundy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9e2343" />
            <stop offset="60%" stopColor="#861c38" />
            <stop offset="100%" stopColor="#681329" />
          </linearGradient>

          {/* Right Face Gradient - Regal Oxblood */}
          <linearGradient id="rightOxblood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#861c38" />
            <stop offset="100%" stopColor="#591022" />
          </linearGradient>

          {/* Left Face Gradient - Shadowed Blackcurrant Wine */}
          <linearGradient id="leftBlackcurrant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f0e1e" />
            <stop offset="100%" stopColor="#2c0710" />
          </linearGradient>

          {/* Underside of Lid - Catching Champagne Core Reflection */}
          <linearGradient id="lidGoldReflection" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#861c38" />
          </linearGradient>

          {/* Drop shadow for the cracked lid */}
          <filter id="lidShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0e060b" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* 1. Dark Interior Box Cavity */}
        <polygon points="10,22 32,10 54,22 32,34" fill="#0f070c" />

        {/* 2. Something Glowing Inside - Radiant Champagne/Gold Core */}
        <circle cx="32" cy="22" r="9" fill="url(#champagneCoreGlow)" opacity="0.95" />
        <circle cx="32" cy="22" r="3.2" fill="#fffdfa" />

        {/* 3. Spill Light onto interior box rim */}
        <ellipse cx="32" cy="24" rx="14" ry="4" fill="#d8b886" opacity="0.45" />

        {/* 4. Left Outer Face of Box (Shadow) */}
        <polygon points="10,22 32,34 32,58 10,46" fill="url(#leftBlackcurrant)" />

        {/* 5. Right Outer Face of Box (Lit) */}
        <polygon points="32,34 54,22 54,46 32,58" fill="url(#rightOxblood)" />

        {/* Subtle center fold edge highlight */}
        <line x1="32" y1="34" x2="32" y2="58" stroke="#d8b886" strokeWidth="0.7" strokeOpacity="0.4" />

        {/* 6. Champagne Light Beam radiating through the cracked slit */}
        <polygon points="18,22 32,19 46,22 40,31 32,32 24,31" fill="url(#champagneSlitBeam)" opacity="0.65" />

        {/* 7. The Lid (Tilted open just enough to see what is inside) */}
        <g filter="url(#lidShadow)">
          {/* Lid thickness / lip */}
          <polygon points="10,16 32,25 32,26.5 10,17.5" fill="url(#leftBlackcurrant)" />
          <polygon points="32,25 54,16 54,17.5 32,26.5" fill="url(#lidGoldReflection)" />

          {/* Top Surface of the Cracked Lid */}
          <polygon points="10,16 32,6 54,16 32,25" fill="url(#lidBurgundy)" />

          {/* Warm Champagne rim highlight on the cracked lid's front leading edge */}
          <line x1="10" y1="16" x2="32" y2="25" stroke="#f5e4c8" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="32" y1="25" x2="54" y2="16" stroke="#f5e4c8" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </svg>

      {showText && (
        <div className={textClassName}>
          <span className="font-serif tracking-[0.08em] text-beige-100 block text-lg leading-none font-semibold">
            SANDBOXED
          </span>
          <span className="text-[10px] text-champagne-500 tracking-[0.22em] uppercase font-sub block mt-1">
            Linux Isolation Engine
          </span>
        </div>
      )}
    </div>
  );
}
