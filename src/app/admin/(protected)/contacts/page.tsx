import type { Metadata } from "next";
import AdminPage from "../admin-page";
import ContactsBoard from "./contacts-board";

export const metadata: Metadata = {
  title: "Contact Requests",
};

export default function ContactsAdminPage() {
  return (
    <AdminPage
      title="Contact requests"
      intro="Messages submitted through the public contact form, newest first, loaded through the contacts API. Archive a request to file it away, or delete it."
    >
      <ContactsBoard />
    </AdminPage>
  );
}
