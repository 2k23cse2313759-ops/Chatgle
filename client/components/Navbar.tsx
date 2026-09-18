"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

        {/* Logo */}
        <Link href="/">
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">
            Chatgle
          </h1>
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-8 text-gray-300 md:flex">
          <Link
            href="/"
            className="transition hover:text-cyan-400"
          >
            Home
          </Link>

          <Link
            href="/video"
            className="transition hover:text-cyan-400"
          >
            Video Chat
          </Link>

          <a
            href="#features"
            className="transition hover:text-cyan-400"
          >
            Features
          </a>

          <a
            href="#safety"
            className="transition hover:text-cyan-400"
          >
            Safety
          </a>
        </div>

        {/* Start Button */}
        <Link
          href="/video"
          className="rounded-full bg-cyan-400 px-6 py-2 font-semibold text-black transition hover:scale-105 hover:bg-cyan-300"
        >
          Start Chat
        </Link>

      </div>
    </motion.nav>
  );
}