import Section from "./Section";
import { links } from "../data";

export default function Links() {
  return (
    <Section id="contact" title="Links & Contact">
      <p className="mb-8 max-w-2xl text-lg text-muted">
        The best ways to reach me and find me online. Feel free to reach out
        about internships, collaborations, or anything interesting.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="group flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-accent/60 hover:bg-surface-2"
          >
            <span className="font-medium">{link.label}</span>
            <span className="text-muted transition-colors group-hover:text-text">
              {link.handle}
            </span>
          </a>
        ))}
      </div>
    </Section>
  );
}
