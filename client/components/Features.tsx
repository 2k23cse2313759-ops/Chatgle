"use client";

import { motion } from "framer-motion";

const features = [
  {
    icon: "🎥",
    title: "HD Video Calling",
    description:
      "Enjoy smooth and high-quality video conversations with people around the world.",
  },
  {
    icon: "⚡",
    title: "Instant Matching",
    description:
      "Find a new stranger quickly and start a conversation without complicated steps.",
  },
  {
    icon: "💬",
    title: "Live Text Chat",
    description:
      "Prefer texting? Connect instantly with realtime text messaging.",
  },
  {
    icon: "🌎",
    title: "Worldwide",
    description:
      "Meet interesting people from different countries and cultures.",
  },
  {
    icon: "🛡️",
    title: "Safety First",
    description:
      "Report and block users while keeping control over your conversations.",
  },
  {
    icon: "🚀",
    title: "Fast Connection",
    description:
      "Built for fast matchmaking and a smooth realtime experience.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative px-6 py-32"
    >
      {/* Background glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Powerful Features
          </p>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            Everything you need
            <br />
            to{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              connect
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-400">
            CamVerse makes meeting new people simple, fast and
            enjoyable.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.08,
              }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl transition duration-300 hover:border-cyan-400/30 hover:bg-white/[0.07]"
            >

              {/* Hover glow */}
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl transition duration-500 group-hover:bg-cyan-400/20" />

              {/* Icon */}
              <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-cyan-400/10">
                {feature.icon}
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-2xl font-bold text-white">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-gray-400">
                  {feature.description}
                </p>
              </div>

              {/* Bottom line */}
              <div className="mt-8 h-px w-0 bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500 group-hover:w-full" />

            </motion.div>
          ))}

        </div>

      </div>
    </section>
  );
}