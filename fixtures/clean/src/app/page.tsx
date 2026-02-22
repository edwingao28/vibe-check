import { Card } from "../components/Card";

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="py-16 px-6">
        <h1 className="text-4xl font-serif tracking-tight text-brand-900 mb-4">
          Track satellite imagery in real time
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl mb-6">
          Orbital View processes high-resolution satellite feeds to detect
          changes in terrain, vegetation, and urban development. Used by
          researchers and conservation teams in 14 countries.
        </p>
        <div className="flex gap-3">
          <a href="/demo" className="btn-primary py-3 px-5 rounded-sm text-sm">
            Watch the demo
          </a>
        </div>
      </section>

      <section className="py-12 px-6 bg-neutral-50">
        <h2 className="text-2xl font-serif text-brand-800 mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-2 gap-6 max-w-4xl">
          <Card
            title="Ingest"
            description="Connect to Landsat, Sentinel-2, or your own drone feeds via the API."
            variant="outline"
          />
          <Card
            title="Analyze"
            description="Run change-detection algorithms across temporal image stacks."
            variant="outline"
          />
        </div>
      </section>

      <section className="py-12 px-6">
        <h2 className="text-2xl font-serif text-brand-800 mb-6">
          Pricing
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-5 rounded-md border border-neutral-200">
            <h3 className="text-lg font-semibold mb-2">Researcher</h3>
            <p className="text-neutral-500 text-sm">Free for academic use</p>
          </div>
          <div className="p-6 rounded-md border-2 border-brand-500 bg-brand-50">
            <h3 className="text-lg font-semibold mb-2">Team</h3>
            <p className="text-neutral-500 text-sm">$49/seat/month</p>
          </div>
          <div className="p-5 rounded-md border border-neutral-200">
            <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
            <p className="text-neutral-500 text-sm">Custom pricing</p>
          </div>
        </div>
      </section>
    </main>
  );
}
