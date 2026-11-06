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
      <h1>Welcome to {siteConfig.siteName}</h1>
      <p>
        Welcome to my portfolio. I build web applications with Next.js and
        TypeScript. Explore my background, browse my projects, and get in
        touch.
      </p>
      <section>
        <h2>Featured Projects</h2>
        <ul className="card-list">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </ul>
      </section>
      <p>
        <Link className="inline-link" href="/projects">
          View all projects
        </Link>
      </p>
    </>
  );
}
