import { LegalPage, legalMetadata } from "@/components/legal-page";

export const metadata = legalMetadata(
  "/terms",
  "Terms of Service",
  "The simple terms for using GenRise's free, browser-based tools."
);

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 2026">
      <section>
        <h2>The deal</h2>
        <p>
          GenRise provides free tools that run in your browser. Use them as much as you like, for
          personal or commercial work, with no account required. By using the site you agree to
          these terms.
        </p>
      </section>

      <section>
        <h2>Your files are yours</h2>
        <p>
          Everything you process stays on your device and remains entirely yours. We claim no
          rights over anything you create with the tools — documents you generate, images you
          edit, and files you convert belong to you.
        </p>
      </section>

      <section>
        <h2>Use it responsibly</h2>
        <p>Please don&apos;t use GenRise to:</p>
        <ul>
          <li>Process content you don&apos;t have the right to use</li>
          <li>Attempt to disrupt, overload, or abuse the service</li>
          <li>Misrepresent the tools or their output</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The tools are provided &ldquo;as is.&rdquo; We work hard to make them accurate and
          reliable, but we can&apos;t guarantee they&apos;re error-free or suitable for every
          purpose. Always double-check output that matters — for example, confirm that a document
          meets the requirements of the form or portal you&apos;re submitting it to. We&apos;re
          not liable for rejected applications, lost data, or other damages arising from use of
          the tools.
        </p>
      </section>

      <section>
        <h2>Specification references</h2>
        <p>
          Some pages reference photo and document requirements published by exam boards,
          government portals, and other authorities. These requirements can change — always verify
          against the current official notification for your application before submitting.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms as the product evolves. The current version is always on this
          page.
        </p>
      </section>
    </LegalPage>
  );
}
