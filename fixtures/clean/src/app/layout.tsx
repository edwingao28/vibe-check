export const metadata = {
  title: "Orbital View - Satellite Imagery Analysis",
  description: "Track satellite imagery in real time for research and conservation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans text-neutral-800 bg-white">{children}</body>
    </html>
  );
}
