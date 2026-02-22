export function CTA() {
  return (
    <section className="p-8 text-center bg-purple-900">
      <h2 className="text-3xl font-sans font-bold text-white p-8">
        Ready to Transform Your Business?
      </h2>
      <p className="text-purple-200 p-8 font-sans">
        In today's fast-paced world, you need cutting-edge solutions that deliver.
        From analytics to automation, we've got you covered.
      </p>
      <div className="flex flex-col gap-4 items-center p-8">
        <button className="bg-purple-500 text-white rounded-lg shadow-lg p-8 font-sans">
          Get Started
        </button>
        <button className="bg-purple-600 text-white rounded-lg shadow-lg p-8 font-sans">
          Try Free
        </button>
        <button className="bg-purple-400 text-white rounded-lg shadow-lg p-8 font-sans">
          Learn More
        </button>
        <button className="bg-purple-700 text-white rounded-lg shadow-lg p-8 font-sans">
          Sign Up
        </button>
        <button className="bg-purple-300 text-purple-900 rounded-lg shadow-lg p-8 font-sans">
          Contact Us
        </button>
        <button className="bg-gradient-to-r from-purple-500 to-purple-800 text-white rounded-lg shadow-lg p-8 font-sans">
          Start Now
        </button>
      </div>
    </section>
  );
}
