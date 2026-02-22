import { Hero } from "../components/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />

      <section className="py-12 px-8">
        <h2 className="text-3xl font-sans font-bold text-gray-800 mb-8">
          Features
        </h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="p-8 bg-gray-50 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-700 mb-4">Real-time Data</h3>
            <p className="text-gray-600">
              Access your data dashboards with live updates every 30 seconds.
              Filter by date range, category, or custom attributes.
            </p>
          </div>
          <div className="p-8 bg-gray-50 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-700 mb-4">Team Sharing</h3>
            <p className="text-gray-600">
              Share reports with your team via link or scheduled email.
              Set permissions per user or group.
            </p>
          </div>
          <div className="p-8 bg-gray-50 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-700 mb-4">API Access</h3>
            <p className="text-gray-600">
              Pull data into your own systems with our REST and GraphQL APIs.
              Rate-limited to 1000 requests per minute.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 px-8 bg-blue-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Trusted by 200+ teams
        </h2>
        <p className="text-gray-600 text-center max-w-lg mx-auto">
          Our customers range from 5-person startups to Fortune 500 data teams.
        </p>
        <div className="flex justify-center gap-4 mt-8">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg font-sans">
            Start Free Trial
          </button>
          <button className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-sans">
            View Pricing
          </button>
        </div>
      </section>
    </main>
  );
}
