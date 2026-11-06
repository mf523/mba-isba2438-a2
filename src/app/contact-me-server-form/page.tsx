import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Me",
};

export default function ContactMeServerForm() {
  return (
    <>
      <h1>Contact Me</h1>
      <p>
        Send me a message using the form below. Submissions will be saved to a
        JSON file when the server form is wired up.
      </p>
      <form>
        <div className="field-group">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div className="field-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field-group">
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={5} required />
        </div>
        <button className="submit-button" type="submit">
          Send Message
        </button>
      </form>
    </>
  );
}
