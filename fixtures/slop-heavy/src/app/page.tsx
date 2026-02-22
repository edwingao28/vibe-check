import { Card } from "../components/Card";
import { Features } from "../components/Features";
import { CTA } from "../components/CTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <section className="p-8 text-center">
        <h1 className="text-5xl font-sans font-bold text-purple-900 mb-8">
          Revolutionize Your Workflow
        </h1>
        <p className="text-xl text-purple-700 p-8 max-w-2xl mx-auto">
          Our innovative platform offers seamless, cutting-edge solutions to streamline
          your business. Whether you're a startup or enterprise, we empower you to
          take your productivity to the next level with our game-changing technology.
          Built for the modern team, our robust and scalable tools are designed with
          you in mind. Everything you need to transform your operations is right here.
        </p>
        <button className="bg-purple-600 text-white p-8 rounded-lg shadow-lg font-sans">
          Get Started Now
        </button>
      </section>

      <Features />

      <section className="p-8 bg-purple-100">
        <h2 className="text-3xl font-sans font-bold text-purple-800 p-8 text-center">
          Ready to Revolutionize Your Business?
        </h2>
        <p className="text-purple-600 p-8 text-center">
          Join thousands of companies who have already leveraged our next-generation
          platform to unlock their full potential. It's never been easier to supercharge
          your workflow with our comprehensive, dynamic solutions.
        </p>
      </section>

      <CTA />
    </main>
  );
}
