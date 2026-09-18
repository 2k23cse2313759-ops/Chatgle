"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24"
    >
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">

        {/* LEFT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            Thousands of people are online
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Meet
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              {" "}New People
            </span>

            <br />

            <span className="text-white">
              From Anywhere.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400">
            Connect with interesting people around the world through
            fast, secure and high-quality video conversations.
          </p>

          {/* BUTTONS */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">

            <Link href="/video">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto rounded-full bg-cyan-400 px-8 py-4 text-lg font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300 cursor-pointer"
              >
                🎥 Start Video Chat
              </motion.button>
            </Link>

            <Link href="/text">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto rounded-full border border-white/15 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-xl transition hover:bg-white/10 cursor-pointer"
              >
                💬 Text Chat
              </motion.button>
            </Link>

          </div>

          {/* TRUST */}
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-gray-500">
            <span>✓ Free to start</span>
            <span>✓ No downloads</span>
            <span>✓ Worldwide</span>
          </div>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          {/* Main card */}
          <div className="relative mx-auto h-[500px] max-w-[430px] rounded-[40px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl">

            {/* Fake video area */}
            <div className="relative h-full overflow-hidden rounded-[30px] bg-gradient-to-br from-purple-900/60 via-slate-900 to-cyan-900/50">

              {/* Person placeholder */}
              <div className="flex h-full items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 text-6xl shadow-2xl backdrop-blur-xl">
                  👤
                </div>
              </div>

              {/* Online badge */}
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                Online
              </div>

              {/* Name */}
              <div className="absolute bottom-6 left-6">
                <p className="text-lg font-bold text-white">
                  Stranger
                </p>
                <p className="text-sm text-gray-300">
                  🌎 Somewhere in the world
                </p>
              </div>

              {/* Controls */}
              <div className="absolute bottom-5 right-5 flex gap-2">
                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl">
                  🎤
                </button>

                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl">
                  📹
                </button>
              </div>

            </div>
          </div>

          {/* Floating card */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-16 top-24 rounded-2xl border border-white/10 bg-black/50 px-5 py-4 shadow-xl backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">
              New connection
            </p>

            <p className="mt-1 font-bold text-white">
              ⚡ Instant Match
            </p>
          </motion.div>

          {/* Floating status */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-10 bottom-24 rounded-2xl border border-white/10 bg-black/50 px-5 py-4 shadow-xl backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">
              Connection
            </p>

            <p className="mt-1 font-bold text-green-400">
              ● Excellent
            </p>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}