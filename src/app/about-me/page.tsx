import type { Metadata } from "next";
import { getAbout } from "@/lib/about";

export const metadata: Metadata = {
  title: "About Me",
};

export default async function AboutMe() {
  const about = await getAbout();

  return (
    <>
      <h1>About Me</h1>
      <p>{about.intro}</p>
      <section>
        <h2>Skills</h2>
        {about.skills.length > 0 ? (
          <ul className="tag-list">
            {about.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <section>
        <h2>Education</h2>
        <p>{about.education}</p>
      </section>
      <section>
        <h2>Experience</h2>
        <p>{about.experience}</p>
      </section>
    </>
  );
}
