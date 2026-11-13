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
        Send me a message using the form below. This form calls the
        /api/contacts endpoint, which validates the input and saves it to the
        same JSON file as the server form.
      </p>
      <ContactApiForm />
    </>
  );
}
