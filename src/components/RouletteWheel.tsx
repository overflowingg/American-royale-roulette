import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "motion/react";
import { WHEEL_SLOTS } from "../constants";
import { RouletteSlot } from "../types";
import { cn } from "../lib/utils";

interface RouletteWheelProps {
  isSpinning: boolean;
  winningIndex: number | null;
  onSpinComplete: () => void;
}

export default function RouletteWheel({ isSpinning, winningIndex, onSpinComplete }: RouletteWheelProps) {
  const controls = useAnimation();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isSpinning && winningIndex !== null) {
      const segmentAngle = 360 / WHEEL_SLOTS.length;
      // American Wheel: index 0 is "0", index 1 is "28", etc.
      // Rotation should land the ball on the segment.
      // The arrow is at the top (0 degrees).
      // If we want index i to be at the top, we need to rotate by -i * segmentAngle.
      // Total spin: current rotation + some full turns + offset to winning segment.
      
      const fullSpins = 5 + Math.random() * 5; // 5 to 10 spins
      const targetRotation = rotation + (fullSpins * 360) + (360 - (winningIndex * segmentAngle));
      
      controls.start({
        rotate: targetRotation,
        transition: {
          duration: 6,
          ease: [0.15, 0, 0.15, 1], // Smooth deceleration
        },
      }).then(() => {
        setRotation(targetRotation % 360);
        onSpinComplete();
      });
    }
  }, [isSpinning, winningIndex]);

  return (
    <div className="relative w-48 h-48 xs:w-56 xs:h-56 sm:w-68 sm:h-68 md:w-76 md:h-76 lg:w-84 lg:h-84 mx-auto select-none">
      {/* Realistic Visual Representation: Outer Gold Ring */}
      <div className="absolute inset-0 rounded-full border-[3px] sm:border-[5px] md:border-[7px] border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.25)] z-0" />
      
      {/* Wood Outer Case */}
      <div className="absolute inset-[2px] sm:inset-[3px] md:inset-[4px] rounded-full border-[2px] sm:border-[3px] md:border-[5px] border-amber-950 shadow-inner z-0" />
      
      {/* The Spinning Wheel */}
      <motion.div
        animate={controls}
        initial={{ rotate: 0 }}
        className="absolute inset-[5px] sm:inset-[9px] md:inset-[12px] rounded-full overflow-hidden border sm:border-2 border-slate-800 shadow-2xl z-10"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full bg-slate-900">
          {WHEEL_SLOTS.map((slot, i) => {
            const segmentAngle = 360 / WHEEL_SLOTS.length;
            const startAngle = i * segmentAngle - 90 - (segmentAngle / 2);
            const endAngle = (i + 1) * segmentAngle - 90 - (segmentAngle / 2);
            
            const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);

            return (
              <g key={slot.number}>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                  fill={slot.color === "red" ? "#b91c1c" : slot.color === "black" ? "#0f172a" : "#059669"}
                  stroke="#1e293b"
                  strokeWidth="0.1"
                />
                <text
                  x="50"
                  y="7.4"
                  transform={`rotate(${i * segmentAngle}, 50, 50)`}
                  fill="#ffffff"
                  fontSize={slot.number.length > 1 ? "5.1" : "5.8"}
                  fontWeight="900"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono tracking-tighter select-none"
                  opacity="0.95"
                >
                  {slot.number}
                </text>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Static Selection Indicator (Top) */}
      <div className="absolute top-[0px] sm:top-[2px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="w-2.5 h-4 sm:w-3.5 sm:h-6 bg-white shadow-xl rounded-b-full border-x border-b border-slate-400" />
      </div>

      {/* Center Hub: Corporate Style */}
      <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 sm:border-3 border-[#D4AF37]/50 shadow-2xl flex items-center justify-center z-20">
         <div className="w-7 sm:w-14 h-1 sm:h-1.5 bg-[#D4AF37]/30 absolute rotate-45 rounded-full blur-[0.5px]"></div>
         <div className="w-7 sm:w-14 h-1 sm:h-1.5 bg-[#D4AF37]/30 absolute -rotate-45 rounded-full blur-[0.5px]"></div>
         <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] border border-slate-200" />
      </div>
    </div>
  );
}
