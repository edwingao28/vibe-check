interface CardProps {
  title: string;
  description: string;
  icon: string;
}

export function Card({ title, description, icon }: CardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-8 text-white">
      <div className="text-4xl mb-4 p-8">{icon}</div>
      <h3 className="text-xl font-sans font-bold mb-2 p-8">{title}</h3>
      <p className="text-purple-100 font-sans p-8">{description}</p>
      <button className="mt-4 bg-white text-purple-700 rounded-lg shadow-lg p-8 font-sans">
        Learn More
      </button>
    </div>
  );
}
