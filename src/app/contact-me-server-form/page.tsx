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
        Have a question or want to work together? Send me a message with the
        form below.
      </p>
      <ContactForm />
    </>
  );
}
