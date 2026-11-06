# Contact Me Server Form — Video Submission Script

Estimated duration: roughly four minutes.

The italic lines are screen-recording directions, not spoken text.

*Show the `/contact-me-server-form` page.*

“This contact form takes a visitor’s message, validates it on the server, and saves it so the administrator can review it. I’ll walk through what happens from clicking Send Message to seeing the saved submission.”

*Open [page.tsx](src/app/contact-me-server-form/page.tsx), then [contact-form.tsx](src/app/contact-me-server-form/contact-form.tsx).*

“The flow starts in page dot TSX, which displays the page heading, a short description, and the ContactForm component.

ContactForm has three fields: name, email, and message. Each field has a name attribute, which identifies its value when the form is submitted.

This component uses the ‘use client’ directive because it manages interactive behavior, including the loading indicator and feedback messages.

The main connection is React’s useActionState hook. It connects the form to the submitContact server action and gives us three values: the current form state, the action passed to the form, and a flag showing whether a submission is pending.”

*Point to `action={formAction}` and the submit button.*

“When the visitor clicks Send Message, the form submits its values through formAction. While the server processes the request, isPending becomes true. The button displays ‘Sending’ and is disabled to prevent repeated clicks while that submission is processing.”

*Open [actions.ts](src/app/contact-me-server-form/actions.ts).*

“The submission reaches submitContact in actions dot TS. This file starts with ‘use server’, so the submission logic executes on the server.

The function receives the previous form state and a FormData object containing the submitted fields. It extracts the name, email, and message, then passes them to validateContactInput.”

*Open [contact-submissions.ts](src/lib/contact-submissions.ts), then demonstrate submitting an empty form.*

“The validation function checks that all three fields contain something other than spaces. It also checks that the email matches a basic email format.

The form uses noValidate, which disables the browser’s automatic validation messages. This lets the application display feedback from its server validation.

For example, submitting an empty form returns an error state with a general message and an error for each missing field. The component displays those errors beside the corresponding inputs. Because validation failed, the server returns before saving anything.”

*Enter “Alex,” “alex@example.com,” and “I’d like to discuss a project,” then submit.*

“With valid information, the action calls saveContactSubmission.

This function trims extra spaces from the beginning and end of each value, creates a unique ID, and adds a submission timestamp. It reads the existing submissions, adds the new entry, and writes the updated list to contact-submissions dot JSON in the default data directory.”

*Show the save function and [json-store.ts](src/lib/json-store.ts).*

“The storage helper queues writes within the running server process. It also writes to a temporary file before renaming it to replace the main file, which helps avoid leaving a partially written JSON file.”

*Return to the form and show the success message.*

“After saving completes, the server returns a success state. The form displays the confirmation and resets its fields. After five seconds, the confirmation begins fading out.

If saving fails, the action returns an error message asking the visitor to try again. In this implementation, a successful submission means the message has been saved to JSON; there is no email-delivery step.”

*Open `/admin/contacts` while signed in as an administrator.*

“The administrator can then open Contact Requests. This protected page reads the saved submissions and displays their names, email addresses, messages, and submission times, with the newest first.

Here, the administrator can find Alex’s message and review the project inquiry.”
