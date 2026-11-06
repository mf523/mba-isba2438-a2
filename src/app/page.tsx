import Link from "next/link";
import { projects } from "@/data/projects";

const skills = ["Next.js", "TypeScript", "React", "Plain CSS", "Node.js"];

export default function Home() {
  return (
    <>
      <h1>Hi, I&apos;m a software developer.</h1>
      <p>
        Welcome to my portfolio. I build web applications with Next.js and
        TypeScript. Explore my background, browse my projects, and get in
        touch.
      </p>
      <section>
        <h2>Featured Projects</h2>
        <ul className="card-list">
          {projects.map((project) => (
            <li key={project.slug} className="card">
              <h3>
                <Link className="inline-link" href={`/projects/${project.slug}`}>
                  {project.title}
                </Link>
              </h3>
              <p>{project.summary}</p>
            </li>
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
    </>
  );
}
