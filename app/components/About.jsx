import Section from "./Section";
import { about } from "../data";

export default function About() {
  return (
    <Section id="about" title="About">
      <div className="grid gap-10 md:grid-cols-3">
        <div className="space-y-4 text-lg leading-relaxed text-muted md:col-span-2">
          {about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
            Skills
          </h3>
          <ul className="flex flex-wrap gap-2">
            {about.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
