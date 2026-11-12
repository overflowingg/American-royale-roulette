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
  const rotationRef = useRef(0);
  const onSpinCompleteRef = useRef(onSpinComplete);

  useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  useEffect(() => {
    if (isSpinning && winningIndex !== null) {
      const segmentAngle = 360 / WHEEL_SLOTS.length;
      
      // Target angle (modulo 360) so that winningIndex lands precisely at the top (12 o'clock pointer)
      const targetMod = (360 - ((winningIndex * segmentAngle) % 360)) % 360;
      const currentMod = ((rotationRef.current % 360) + 360) % 360;
      
      let forwardDelta = targetMod - currentMod;
      if (forwardDelta <= 0) {
        forwardDelta += 360;
      }
      
      // 5 to 8 full integer spins ensures continuous clockwise rotation without fractional drift
      const fullSpins = 5 + Math.floor(Math.random() * 4);
      const targetRotation = rotationRef.current + (fullSpins * 360) + forwardDelta;
      
      controls.start({
        rotate: targetRotation,
        transition: {
          duration: 5.5,
          ease: [0.15, 0, 0.15, 1], // Realistic smooth wheel deceleration
        },
      }).then(() => {
        rotationRef.current = targetRotation;
        onSpinCompleteRef.current();
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

      {/* Static Selection Needle Indicator (Pointing straight down at 12 o'clock segment) */}
      <div className="absolute -top-1 sm:-top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
        {/* Needle Top Bracket */}
        <div className="w-3.5 sm:w-5 h-2 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-t-sm shadow-md border-t border-x border-yellow-100" />
        {/* Needle Arrow Tip pointing downward */}
        <div className="w-0 h-0 border-l-[6px] sm:border-l-[8px] border-l-transparent border-r-[6px] sm:border-r-[8px] border-r-transparent border-t-[12px] sm:border-t-[16px] border-t-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] filter -mt-[1px]" />
        {/* Center Glow Dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)] -mt-4 sm:-mt-5 z-40" />
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
