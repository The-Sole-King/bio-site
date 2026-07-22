// Shared wrapper so every section has consistent spacing + a heading.
export default function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-10 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
