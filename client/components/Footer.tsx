import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/10">

      <div className="mx-auto max-w-7xl px-6 py-14">

        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-2">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                🚀
              </div>

              <h2 className="text-2xl font-black">
                Chat<span className="text-cyan-400">gle</span>
              </h2>

            </div>

            <p className="mt-5 max-w-md leading-7 text-gray-500">
              A modern way to meet interesting people around the world
              through meaningful conversations.
            </p>

          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white">
              Product
            </h3>

            <div className="mt-5 space-y-3 text-sm text-gray-500">
              <p className="cursor-pointer transition hover:text-cyan-400">
                <Link href="/video">Video Chat</Link>
              </p>

              <p className="cursor-pointer transition hover:text-cyan-400">
                <Link href="/text">Text Chat</Link>
              </p>

              <p className="cursor-pointer transition hover:text-cyan-400">
                <a href="#features">Features</a>
              </p>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white">
              Company
            </h3>

            <div className="mt-5 space-y-3 text-sm text-gray-500">
              <p className="cursor-pointer transition hover:text-cyan-400">
                About
              </p>

              <p className="cursor-pointer transition hover:text-cyan-400">
                Safety
              </p>

              <p className="cursor-pointer transition hover:text-cyan-400">
                Privacy
              </p>

              <p className="cursor-pointer transition hover:text-cyan-400">
                Terms
              </p>
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">

          <p>
            © 2026 Chatgle. All rights reserved.
          </p>

          <p className="text-gray-400 font-medium">
            Build with love abhay ❤️
          </p>

        </div>

      </div>

    </footer>
  );
}