import React from 'react';

interface CarTokenProps {
  cx: number;
  cy: number;
  angle: number;
  playerIdx: number;
  isLeader?: boolean;
}

export const CarToken: React.FC<CarTokenProps> = ({
  cx,
  cy,
  angle,
  playerIdx,
  isLeader = false,
}) => {
  const isP1 = playerIdx === 0;

  return (
    <g
      transform={`translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${angle.toFixed(1)})`}
      className="transition-all duration-300 ease-out pointer-events-none drop-shadow-xl"
    >
      {/* Drop Shadow beneath car */}
      <ellipse
        cx="-0.5"
        cy="1"
        rx={isP1 ? 12 : 13.5}
        ry="6.5"
        fill="rgba(0,0,0,0.45)"
        filter="blur(1.5px)"
      />

      {/* Leader Gold Aura */}
      {isLeader && (
        <ellipse
          cx="0"
          cy="0"
          rx={isP1 ? 14 : 15.5}
          ry="7.5"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          className="animate-pulse"
          opacity="0.85"
        />
      )}

      {isP1 ? (
        /* ========================================================= */
        /* PLAYER 1: BLUE HATCHBACK (car_hatch.svg)                  */
        /* ========================================================= */
        <g key="car-hatch-p1">
          {/* 4 Rubber Tires */}
          <rect x="4.5" y="-6.8" width="4.5" height="1.8" rx="0.7" fill="#090d16" />
          <rect x="4.5" y="5" width="4.5" height="1.8" rx="0.7" fill="#090d16" />
          <rect x="-8.5" y="-6.8" width="4.5" height="1.8" rx="0.7" fill="#090d16" />
          <rect x="-8.5" y="5" width="4.5" height="1.8" rx="0.7" fill="#090d16" />

          {/* Outer Shell Dark Rim */}
          <path
            d="M -10.5 -5.8 C -12.5 -5.8 -13 -4.5 -13 -2.5 L -13 2.5 C -13 4.5 -12.5 5.8 -10.5 5.8 L 8.5 5.8 C 10.8 5.8 12.2 4.2 12.8 1.8 L 12.8 -1.8 C 12.2 -4.2 10.8 -5.8 8.5 -5.8 Z"
            fill="#091329"
          />

          {/* Blue Body Shell */}
          <path
            d="M -10 -5.2 C -11.8 -5.2 -12.2 -4 -12.2 -2.2 L -12.2 2.2 C -12.2 4 -11.8 5.2 -10 5.2 L 8 5.2 C 10.2 5.2 11.5 3.8 12 1.5 L 12 -1.5 C 11.5 -3.8 10.2 -5.2 8 -5.2 Z"
            fill="#2563eb"
          />

          {/* Side Contour Shadows */}
          <rect x="-9.5" y="-5.2" width="16" height="0.7" fill="#1d4ed8" />
          <rect x="-9.5" y="4.5" width="16" height="0.7" fill="#1d4ed8" />

          {/* Front Headlights (White/Cyan) */}
          <polygon
            points="9.2,-4.8 11.8,-3.5 11.2,-1.8 8.8,-2.6"
            fill="#ffffff"
            stroke="#38bdf8"
            strokeWidth="0.3"
          />
          <polygon
            points="9.2,4.8 11.8,3.5 11.2,1.8 8.8,2.6"
            fill="#ffffff"
            stroke="#38bdf8"
            strokeWidth="0.3"
          />

          {/* Rear Taillights (Red) */}
          <rect x="-12.2" y="-4.8" width="1.6" height="1.8" rx="0.4" fill="#ef4444" />
          <rect x="-12.2" y="3" width="1.6" height="1.8" rx="0.4" fill="#ef4444" />

          {/* Hood Surface */}
          <path d="M 4.5 -3.2 L 9.8 -2.2 L 9.8 2.2 L 4.5 3.2 Z" fill="#3b82f6" opacity="0.6" />

          {/* Cabin Glasshouse Base */}
          <path
            d="M -8 -4.4 L 4.5 -4.4 C 5.5 -4.4 6.2 -3.2 6.6 0 C 6.2 3.2 5.5 4.4 4.5 4.4 L -8 4.4 C -9 4.4 -9.4 3.2 -9.6 0 C -9.4 -3.2 -9 -4.4 -8 -4.4 Z"
            fill="#0f172a"
          />

          {/* Front Windshield Glass */}
          <path
            d="M 3.4 -3.8 L 4.8 -3.8 C 5.8 -3.2 6.2 -1.2 6.2 0 C 6.2 1.2 5.8 3.2 4.8 3.8 L 3.4 3.8 C 4 2.2 4.3 0 4.3 0 C 4.3 0 4 -2.2 3.4 -3.8 Z"
            fill="#93c5fd"
          />
          <line
            x1="3.8"
            y1="-2.6"
            x2="5.2"
            y2="-0.8"
            stroke="#ffffff"
            strokeWidth="0.6"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Crisp White Roof Panel */}
          <rect
            x="-4"
            y="-3.2"
            width="6.8"
            height="6.4"
            rx="0.9"
            fill="#f8fafc"
            stroke="#1d4ed8"
            strokeWidth="0.5"
          />
          <rect x="-3" y="-2.2" width="4.8" height="4.4" rx="0.5" fill="#e2e8f0" />

          {/* Rear Hatch Window Glass */}
          <path
            d="M -8.2 -3.4 L -5.5 -3.8 L -5.5 3.8 L -8.2 3.4 C -8.8 2.2 -9 0 -9 0 C -9 0 -8.8 -2.2 -8.2 -3.4 Z"
            fill="#7dd3fc"
          />

          {/* Rear Hatch Lip */}
          <rect x="-9.8" y="-3.8" width="1" height="7.6" rx="0.4" fill="#1e40af" />

          {/* Leader Mini Crown badge */}
          {isLeader && (
            <text
              x="0"
              y="-4.5"
              textAnchor="middle"
              fontSize="4"
              fill="#fbbf24"
              fontWeight="bold"
            >
              👑
            </text>
          )}
        </g>
      ) : (
        /* ========================================================= */
        /* PLAYER 2 / BOT: RED SALOON (car_saloon.svg)               */
        /* ========================================================= */
        <g key="car-saloon-p2">
          {/* 4 Rubber Tires */}
          <rect x="6" y="-6.5" width="4.8" height="1.6" rx="0.7" fill="#090d16" />
          <rect x="6" y="4.9" width="4.8" height="1.6" rx="0.7" fill="#090d16" />
          <rect x="-9.5" y="-6.5" width="4.8" height="1.6" rx="0.7" fill="#090d16" />
          <rect x="-9.5" y="4.9" width="4.8" height="1.6" rx="0.7" fill="#090d16" />

          {/* Outer Shell Dark Border */}
          <path
            d="M -12.5 -5.4 C -14 -5.4 -14.4 -4.2 -14.4 -2.2 L -14.4 2.2 C -14.4 4.2 -14 5.4 -12.5 5.4 L 9.8 5.4 C 12 5.4 13.4 3.8 14 1.8 L 14 -1.8 C 13.4 -3.8 12 -5.4 9.8 -5.4 Z"
            fill="#180404"
          />

          {/* Crimson Red Body Shell */}
          <path
            d="M -12 -4.8 C -13.2 -4.8 -13.6 -3.8 -13.6 -1.8 L -13.6 1.8 C -13.6 3.8 -13.2 4.8 -12 4.8 L 9.4 4.8 C 11.5 4.8 12.8 3.5 13.2 1.6 L 13.2 -1.6 C 12.8 -3.5 11.5 -4.8 9.4 -4.8 Z"
            fill="#dc2626"
          />

          {/* Side Contour Shadows */}
          <rect x="-11.5" y="-4.8" width="20" height="0.7" fill="#b91c1c" />
          <rect x="-11.5" y="4.1" width="20" height="0.7" fill="#b91c1c" />

          {/* Front Warm Amber Headlights */}
          <polygon
            points="10,-4.4 12.8,-3.2 12.2,-1.6 9.6,-2.4"
            fill="#fef08a"
            stroke="#ca8a04"
            strokeWidth="0.3"
          />
          <polygon
            points="10,4.4 12.8,3.2 12.2,1.6 9.6,2.4"
            fill="#fef08a"
            stroke="#ca8a04"
            strokeWidth="0.3"
          />

          {/* Rear Taillights */}
          <rect
            x="-13.4"
            y="-4.4"
            width="1.5"
            height="1.6"
            rx="0.3"
            fill="#991b1b"
            stroke="#7f1d1d"
            strokeWidth="0.2"
          />
          <rect
            x="-13.4"
            y="2.8"
            width="1.5"
            height="1.6"
            rx="0.3"
            fill="#991b1b"
            stroke="#7f1d1d"
            strokeWidth="0.2"
          />

          {/* Long Hood Center Crease */}
          <line x1="5" y1="0" x2="12" y2="0" stroke="#ef4444" strokeWidth="0.6" />
          <polygon points="5.5,-2.6 11,-1.8 11,1.8 5.5,2.6" fill="#ef4444" opacity="0.35" />

          {/* Cabin Glasshouse Surround */}
          <path
            d="M -7.5 -4.2 L 5 -4.2 C 6 -4.2 6.6 -3 7 0 C 6.6 3 6 4.2 5 4.2 L -7.5 4.2 C -8.6 4.2 -9 3 -9.2 0 C -9 -3 -8.6 -4.2 -7.5 -4.2 Z"
            fill="#180404"
          />

          {/* Front Windshield Glass */}
          <path
            d="M 3.8 -3.5 L 5.2 -3.5 C 6.2 -2.8 6.6 -1 6.6 0 C 6.6 1 6.2 2.8 5.2 3.5 L 3.8 3.5 C 4.5 2 4.8 0 4.8 0 C 4.8 0 4.5 -2 3.8 -3.5 Z"
            fill="#93c5fd"
          />
          <line
            x1="4.2"
            y1="-2.4"
            x2="5.8"
            y2="-0.6"
            stroke="#ffffff"
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Red Roof Panel with Dark Trim */}
          <rect
            x="-4.5"
            y="-3.1"
            width="7.5"
            height="6.2"
            rx="0.7"
            fill="#b91c1c"
            stroke="#7f1d1d"
            strokeWidth="0.4"
          />
          <rect x="-3.2" y="-2" width="5.2" height="4" rx="0.5" fill="#991b1b" />

          {/* Rear Window Glass */}
          <path
            d="M -7.8 -3.3 L -5 -3.5 L -5 3.5 L -7.8 3.3 C -8.4 2 -8.6 0 -8.6 0 C -8.6 0 -8.4 -2 -7.8 -3.3 Z"
            fill="#7dd3fc"
          />

          {/* Extended Saloon Boot / Trunk Deck */}
          <rect
            x="-12.2"
            y="-3.5"
            width="3.5"
            height="7"
            rx="0.5"
            fill="#b91c1c"
            stroke="#7f1d1d"
            strokeWidth="0.4"
          />
          <line x1="-11.4" y1="-2.8" x2="-11.4" y2="2.8" stroke="#dc2626" strokeWidth="0.5" />

          {/* Leader Mini Crown badge */}
          {isLeader && (
            <text
              x="0"
              y="-4.5"
              textAnchor="middle"
              fontSize="4"
              fill="#fbbf24"
              fontWeight="bold"
            >
              👑
            </text>
          )}
        </g>
      )}
    </g>
  );
};
