export const metadata = {
  title: "Synergy Pro - Revolutionize Your Workflow",
  description: "The next-generation platform for modern teams",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-white text-purple-900">{children}</body>
    </html>
  );
}
