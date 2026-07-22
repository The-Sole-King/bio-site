import { profile } from "../data";

export default function Hero() {
  return (
    <section className="glow relative overflow-hidden">
      <div className="mx-auto flex max-w-5xl flex-col items-start px-6 py-28 sm:py-36">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
          {profile.location}
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Hi, I&apos;m{" "}
          <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            {profile.name}
          </span>
        </h1>

        <p className="mt-3 text-lg font-medium text-muted">
          {profile.role}
        </p>

        <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted">
          {profile.intro}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#projects"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            View my work
          </a>
          <a
            href="#contact"
            className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-muted"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
