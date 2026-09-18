"use client";

import { motion } from "framer-motion";

const stats = [
  {
    number: "125K+",
    label: "People Online",
  },
  {
    number: "180+",
    label: "Countries",
  },
  {
    number: "2M+",
    label: "Connections",
  },
  {
    number: "99.9%",
    label: "Uptime",
  },
];

export default function Stats() {
  return (
    <section className="relative px-6 py-28">
      
      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl">

        {/* Top line */}
        <div className="mb-16 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">

          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
              }}
              className="text-center"
            >
              <h3 className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-4xl font-black text-transparent sm:text-5xl md:text-6xl">
                {stat.number}
              </h3>

              <p className="mt-3 text-sm text-gray-500 sm:text-base">
                {stat.label}
              </p>
            </motion.div>
          ))}

        </div>

        {/* Bottom line */}
        <div className="mt-16 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      </div>
    </section>
  );
}