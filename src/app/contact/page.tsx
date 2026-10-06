import { LegalPage, legalMetadata } from "@/components/legal-page";

export const metadata = legalMetadata(
  "/contact",
  "Contact",
  "Get in touch with the GenRise team — bugs, feedback, tool requests."
);

export default function ContactPage() {
  return (
    <LegalPage title="Contact" updated="October 2026">
      <section>
        <h2>Reach us</h2>
        <p>
          Bug reports, feature requests, feedback on a tool, or a correction to a form
          specification — we read everything. The fastest ways to reach us:
        </p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:hello@genrisetech.in">hello@genrisetech.in</a>
          </li>
          <li>
            <strong>GitHub:</strong>{" "}
            <a href="https://github.com/SHRIRAM-S008/Genrise-tools/issues" target="_blank" rel="noopener noreferrer">
              Open an issue
            </a>{" "}
            — best for bugs and tool requests, since the project is open source
          </li>
          <li>
            <strong>LinkedIn:</strong>{" "}
            <a href="https://www.linkedin.com/company/genrise-tech/" target="_blank" rel="noopener noreferrer">
              GenRise Tech
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Wrong spec? Tell us.</h2>
        <p>
          Exam and document requirements change with every notification cycle. If a photo size,
          file limit, or dimension on one of our form pages doesn&apos;t match the current
          official requirement, email us a link to the notification and we&apos;ll fix it fast.
        </p>
      </section>

      <section>
        <h2>Privacy questions</h2>
        <p>
          Since we never see your files, most privacy questions have a simple answer — but if you
          want details about analytics, cookies, or data handling, see the{" "}
          <a href="/privacy">privacy policy</a> or write to us directly.
        </p>
      </section>
    </LegalPage>
  );
}
