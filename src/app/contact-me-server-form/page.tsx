import type { Metadata } from "next";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Me",
};

export default function ContactMeServerForm() {
  return (
    <>
      <h1>Contact Me</h1>
      <p>
        Send me a message using the form below. Submissions are validated on
        the server and saved to a JSON file.
      </p>
      <ContactForm />
    </>
  );
}
