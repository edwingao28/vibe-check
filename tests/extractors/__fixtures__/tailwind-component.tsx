import React from "react";

export function HeroSection() {
  return (
    <section className="p-8 m-4 bg-purple-500 text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-sans mb-4">Welcome to Our Platform</h1>
      <p className="text-gray-200 mb-8">Build something amazing today.</p>
      {/* slop-ignore: cta-mania */}
      <button className="bg-indigo-600 text-white px-6 py-3 rounded-md shadow-md">
        Get Started
      </button>
    </section>
  );
}

export function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 m-2 bg-white rounded-lg shadow-md border-gray-200">
      <h3 className="text-lg font-serif text-purple-700">{title}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <div className="gap-6 p-12">
      <Card title="Feature 1" description="Description 1" />
      <Card title="Feature 2" description="Description 2" />
      <Card title="Feature 3" description="Description 3" />
    </div>
  );
}
