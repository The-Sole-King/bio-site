import "./globals.css";

export const metadata = {
  title: "Rushd AlAshqar — Computer Science & Software Developer",
  description:
    "Personal site of Rushd AlAshqar — Honors Computer Science student at Western University building AI agents, autonomous systems, and full-stack software.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
