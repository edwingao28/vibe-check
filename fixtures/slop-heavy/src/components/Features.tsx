import { Card } from "./Card";

export function Features() {
  return (
    <section className="p-8 bg-white">
      <h2 className="text-3xl font-sans font-bold text-purple-800 text-center p-8">
        Powerful Features for Modern Teams
      </h2>
      <div className="grid grid-cols-3 gap-8 p-8">
        <Card
          title="Seamless Integration"
          description="Our innovative platform seamlessly connects with your existing tools to streamline your workflow."
          icon="🚀"
        />
        <Card
          title="Cutting-Edge Analytics"
          description="Leverage powerful, robust analytics to gain comprehensive insights and elevate your decision making."
          icon="📊"
        />
        <Card
          title="Scalable Solutions"
          description="Our dynamic and flexible architecture empowers your team to scale effortlessly as you grow."
          icon="⚡"
        />
      </div>
    </section>
  );
}
