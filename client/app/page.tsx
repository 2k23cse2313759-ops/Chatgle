import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Stats from "../components/Stats";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Footer />
    </main>
  );
}