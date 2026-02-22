export function Hero() {
  return (
    <section className="py-16 px-8 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
      <h1 className="text-5xl font-sans font-bold mb-6">
        DataPulse Analytics
      </h1>
      <p className="text-xl mb-8 max-w-2xl text-blue-100">
        A dashboard tool for teams who need to monitor KPIs across multiple
        data sources. Connect PostgreSQL, BigQuery, or CSV files and get
        automated daily reports.
      </p>
      <button className="bg-white text-blue-700 px-8 py-4 rounded-lg shadow-lg font-sans font-bold">
        Try it Free
      </button>
    </section>
  );
}
