import React from 'react';
import microCar from '../assets/micro.svg';
import muscleCar from '../assets/muscle.svg';
import sportsCar from '../assets/sports.svg';
import tourerCar from '../assets/tourer.svg';

interface CarTokenProps {
  cx: number;
  cy: number;
  angle: number;
  playerIdx: number;
  isLeader?: boolean;
}

const CAR_IMAGES = [muscleCar, sportsCar, tourerCar, microCar];

export const CarToken: React.FC<CarTokenProps> = ({
  cx,
  cy,
  angle,
  playerIdx,
  isLeader = false,
}) => (
  <g
    transform={`translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${angle.toFixed(1)})`}
    className="transition-all duration-300 ease-out pointer-events-none drop-shadow-xl"
  >
    <ellipse
      cx="0"
      cy="1"
      rx="13.5"
      ry="6.5"
      fill="rgba(0,0,0,0.45)"
      filter="blur(1.5px)"
    />
    {isLeader && (
      <ellipse
        cx="0"
        cy="0"
        rx="15.5"
        ry="7.5"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        className="animate-pulse"
        opacity="0.85"
      />
    )}
    <image
      href={CAR_IMAGES[playerIdx % CAR_IMAGES.length]}
      x="-8"
      y="-15"
      width="16"
      height="30"
      transform="rotate(90)"
      preserveAspectRatio="xMidYMid meet"
    />
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
);
