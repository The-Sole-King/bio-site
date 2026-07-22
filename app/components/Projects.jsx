import Section from "./Section";
import { projects } from "../data";

export default function Projects() {
  return (
    <Section id="projects" title="Projects">
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <a
            key={project.title}
            href={project.href}
            className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-accent/60 hover:bg-surface-2"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold tracking-tight">
                {project.title}
              </h3>
              <span
                aria-hidden
                className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              >
                ↗
              </span>
            </div>
            <p className="mt-3 flex-1 text-muted">
              {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}
