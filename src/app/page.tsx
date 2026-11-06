import Link from "next/link";
import ProjectCard from "@/components/project-card";
import { projects } from "@/data/projects";
import { getSiteConfig } from "@/lib/site-config";

const skills = ["Next.js", "TypeScript", "React", "Plain CSS", "Node.js"];

export default async function Home() {
  const siteConfig = await getSiteConfig();

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
      <section>
        <h2>Skills</h2>
        <ul className="tag-list">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
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
