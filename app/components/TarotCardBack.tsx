export default function TarotCardBack({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 300"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="checkerPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="10" height="10" fill="#1a1a1a"/>
          <rect x="10" y="0" width="10" height="10" fill="#0a0a0a"/>
          <rect x="0" y="10" width="10" height="10" fill="#0a0a0a"/>
          <rect x="10" y="10" width="10" height="10" fill="#1a1a1a"/>
        </pattern>
        
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.2"/>
          <stop offset="50%" stopColor="#0a0a0a" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#4a5f4f" stopOpacity="0.3"/>
        </linearGradient>
      </defs>

      {/* Card background */}
      <rect width="200" height="300" fill="url(#checkerPattern)" rx="10"/>
      <rect width="200" height="300" fill="url(#cardGradient)" rx="10"/>

      {/* Border */}
      <rect x="5" y="5" width="190" height="290" fill="none" stroke="#ff6b35" strokeWidth="2" rx="8"/>
      <rect x="10" y="10" width="180" height="280" fill="none" stroke="#ff6b35" strokeWidth="1" strokeOpacity="0.5" rx="6"/>

      {/* Central rabbit silhouette */}
      <g transform="translate(100, 150)">
        {/* Rabbit body */}
        <ellipse cx="0" cy="10" rx="25" ry="35" fill="#ff6b35" opacity="0.8"/>
        
        {/* Rabbit head */}
        <circle cx="0" cy="-15" r="18" fill="#ff6b35" opacity="0.8"/>
        
        {/* Rabbit ears */}
        <ellipse cx="-8" cy="-30" rx="6" ry="20" fill="#ff6b35" opacity="0.8" transform="rotate(-15 -8 -30)"/>
        <ellipse cx="8" cy="-30" rx="6" ry="20" fill="#ff6b35" opacity="0.8" transform="rotate(15 8 -30)"/>
        
        {/* Pocket watch */}
        <circle cx="0" cy="10" r="12" fill="none" stroke="#f5e6d3" strokeWidth="1.5" opacity="0.9"/>
        <circle cx="0" cy="10" r="10" fill="#1a1a1a" opacity="0.8"/>
        <line x1="0" y1="10" x2="0" y2="4" stroke="#ff6b35" strokeWidth="1.5"/>
        <line x1="0" y1="10" x2="5" y2="10" stroke="#ff6b35" strokeWidth="1"/>
      </g>

      {/* Corner carrots */}
      <g transform="translate(30, 30)">
        <polygon points="0,0 -3,12 3,12" fill="#ff6b35" opacity="0.6"/>
        <path d="M -1,-2 Q -3,-5 -2,-7 M 0,-2 Q 0,-6 1,-8 M 1,-2 Q 3,-5 2,-7" 
              stroke="#4a5f4f" strokeWidth="0.5" fill="none" opacity="0.8"/>
      </g>

      <g transform="translate(170, 30)">
        <polygon points="0,0 -3,12 3,12" fill="#ff6b35" opacity="0.6"/>
        <path d="M -1,-2 Q -3,-5 -2,-7 M 0,-2 Q 0,-6 1,-8 M 1,-2 Q 3,-5 2,-7" 
              stroke="#4a5f4f" strokeWidth="0.5" fill="none" opacity="0.8"/>
      </g>

      <g transform="translate(30, 270)">
        <polygon points="0,0 -3,12 3,12" fill="#ff6b35" opacity="0.6"/>
        <path d="M -1,-2 Q -3,-5 -2,-7 M 0,-2 Q 0,-6 1,-8 M 1,-2 Q 3,-5 2,-7" 
              stroke="#4a5f4f" strokeWidth="0.5" fill="none" opacity="0.8"/>
      </g>

      <g transform="translate(170, 270)">
        <polygon points="0,0 -3,12 3,12" fill="#ff6b35" opacity="0.6"/>
        <path d="M -1,-2 Q -3,-5 -2,-7 M 0,-2 Q 0,-6 1,-8 M 1,-2 Q 3,-5 2,-7" 
              stroke="#4a5f4f" strokeWidth="0.5" fill="none" opacity="0.8"/>
      </g>

      {/* Decorative text */}
      <text x="100" y="260" textAnchor="middle" fill="#f5e6d3" opacity="0.4" fontSize="10" fontFamily="serif">
        C-AROT
      </text>
    </svg>
  );
}
