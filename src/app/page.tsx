import Link from "next/link";
import ProjectCard from "@/components/project-card";
import { getProjects } from "@/lib/projects";
import { getSiteConfig } from "@/lib/site-config";

export default async function Home() {
  const [siteConfig, projects] = await Promise.all([
    getSiteConfig(),
    getProjects(),
  ]);

  return (
    <>
      <section className="hero">
        <h1>Welcome to {siteConfig.siteName}</h1>
        <p>
          {siteConfig.tagline ||
            "I build web applications with Next.js and TypeScript."}
        </p>
        <div className="hero-actions">
          <Link className="button-primary" href="/projects">
            View projects
          </Link>
          <Link className="secondary-button" href="/contact-me">
            Get in touch
          </Link>
        </div>
      </section>
      <section>
        <h2>Featured Projects</h2>
        <ul className="card-list grid-two">
          {projects.slice(0, 3).map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </ul>
        {projects.length > 3 ? (
          <p>
            <Link className="inline-link" href="/projects">
              All projects →
            </Link>
          </p>
        ) : null}
      </section>
    </>
  );
}
