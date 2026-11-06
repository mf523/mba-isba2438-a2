import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Me",
};

export default function AboutMe() {
  return (
    <>
      <h1>About Me</h1>
      <p>
        I am a student and software developer studying at Santa Clara
        University. I enjoy building full-stack web applications and learning
        how products are designed, built, and shipped.
      </p>
      <section>
        <h2>Education</h2>
        <p>
          MBA coursework with a focus on technology and product development.
        </p>
      </section>
      <section>
        <h2>Experience</h2>
        <p>
          I have built web apps with Next.js, worked with TypeScript across
          the stack, and practiced shipping small features end to end.
        </p>
      </section>
    </>
  );
}
