"use client";

import { motion } from "framer-motion";

export default function PremiumCTA() {
  return (
    <section className="relative px-6 py-28">
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/[0.03] to-purple-500/10 p-10 text-center backdrop-blur-xl md:p-16"
      >
        {/* Decorative glow */}
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10">

          <span className="inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300">
            ✨ Unlock the full experience
          </span>

          <h2 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
            Meet more people.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Connect without limits.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-400 md:text-lg">
            Discover better matches, unlock premium filters and enjoy a
            smoother CamVerse experience.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">

            <button className="rounded-full bg-cyan-400 px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-cyan-300">
              🚀 Explore Premium
            </button>

            <button className="rounded-full border border-white/15 bg-white/5 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
              Start for Free
            </button>

          </div>

        </div>
      </motion.div>
    </section>
  );
}