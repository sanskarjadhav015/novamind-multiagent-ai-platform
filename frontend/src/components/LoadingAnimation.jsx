import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";

/**
 * ============================================================================
 * LOADING ANIMATION COMPONENT (`LoadingAnimation.jsx`)
 * ============================================================================
 * Visual indicator shown while the Agent Service and LLMs are executing:
 * - Dynamic rotating status labels ("Thinking...", "Reasoning...", etc.).
 * - Radiating beacon rings around the AI core.
 * - Bouncing gradient dots.
 * ============================================================================
 */

const THINKING_LABELS = [
  "Thinking...",
  "Analyzing context...",
  "Reasoning...",
  "Crafting response..."
];

function LoadingAnimation() {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % THINKING_LABELS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const currentLabel = THINKING_LABELS[labelIndex];

  return (
    <div className="flex items-center gap-3.5 my-2 max-w-[92vw] md:max-w-[70%] py-1">
      {/* Animated AI Core Icon with radiating rings */}
      <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
        {[0, 0.7, 1.4].map((delayTime, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-xl border border-indigo-500/30 bg-indigo-500/5"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{
              scale: [0.8, 1.35, 1.7],
              opacity: [0.65, 0.25, 0]
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: delayTime,
              ease: "easeOut"
            }}
          />
        ))}

        <motion.div
          className="relative z-10 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-violet-600/25 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.25)]"
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 4, -4, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles size={15} className="text-indigo-400 animate-pulse" />
        </motion.div>
      </div>

      {/* Dynamic Status Pill with Slide-in Label & Bouncing Dots */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLabel}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-1.5"
          >
            <span className="text-[13px] font-medium text-slate-300 tracking-wide">
              {currentLabel}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* 3 Bouncing Dots */}
        <div className="flex items-center gap-1 pl-0.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
              animate={{
                scale: [0.8, 1.35, 0.8],
                opacity: [0.35, 1, 0.35]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: dot * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingAnimation;
