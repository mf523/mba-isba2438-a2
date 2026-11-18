import type { Metadata } from "next";
import ContactApiForm from "./contact-api-form";

export const metadata: Metadata = {
  title: "Contact Me (API)",
};

export default function ContactMeApi() {
  return (
    <>
      <h1>Contact Me (API)</h1>
      <p>
        Have a question or want to work together? Send me a message with the
        form below. This version of the form demonstrates a client-side fetch
        to the /api/contacts endpoint.
      </p>
      <ContactApiForm />
    </>
  );
}
