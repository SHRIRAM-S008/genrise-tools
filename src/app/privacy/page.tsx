import { LegalPage, legalMetadata } from "@/components/legal-page";

export const metadata = legalMetadata(
  "/privacy",
  "Privacy Policy",
  "How GenRise handles your data — the short answer: your files never leave your device."
);

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <section>
        <h2>The short version</h2>
        <p>
          Every GenRise tool runs entirely inside your browser. When you drop a file into a tool,
          it is processed by your own device using web technologies like Canvas, WebAssembly, and
          the File API. <strong>Your files are never uploaded to our servers — we don&apos;t
          even have servers that receive them.</strong>
        </p>
      </section>

      <section>
        <h2>What never leaves your device</h2>
        <ul>
          <li>Images, PDFs, documents, audio, and video you process with any tool</li>
          <li>Text you paste into formatters, testers, and generators</li>
          <li>Camera and microphone input used by the scanner and recorder tools</li>
          <li>Any file names, sizes, or contents</li>
        </ul>
        <p>
          You can verify this yourself: open your browser&apos;s developer tools, watch the Network
          tab, and run any tool. You&apos;ll see no file data transmitted.
        </p>
      </section>

      <section>
        <h2>What we do collect</h2>
        <h3>Usage analytics (anonymous)</h3>
        <p>
          If analytics are enabled, we measure <strong>page views and product events</strong> —
          things like &ldquo;someone opened the PDF merger&rdquo; or &ldquo;a result was
          downloaded&rdquo; — using Google Analytics 4. These events never include file names,
          file contents, or anything you type into a tool. They tell us which tools are useful so
          we know what to improve.
        </p>
        <h3>Newsletter email (only if you subscribe)</h3>
        <p>
          If you enter your email in the newsletter form, we store that address to send occasional
          updates about new tools. You can unsubscribe at any time — every email includes a link,
          or write to us and we&apos;ll remove you.
        </p>
        <h3>Advertising cookies (only if ads are enabled)</h3>
        <p>
          If we display ads through Google AdSense, Google may set cookies to serve and measure
          ads. These are controlled by Google&apos;s own policy; you can opt out of personalised
          ads at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.
        </p>
      </section>

      <section>
        <h2>What&apos;s stored in your browser</h2>
        <p>
          A few preferences live in your browser&apos;s local storage so the site remembers you:
          your favorite and recently used tools, theme preference, and whether you&apos;ve
          subscribed to the newsletter. This data stays on your device and can be cleared from
          your browser settings at any time.
        </p>
      </section>

      <section>
        <h2>What we never do</h2>
        <ul>
          <li>Sell or share your data with anyone</li>
          <li>Require an account, email, or sign-up to use a tool</li>
          <li>Add watermarks to your files</li>
          <li>Track the contents of your files or inputs</li>
        </ul>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          Privacy questions deserve real answers. Write to us via the
          {" "}<a href="/contact">contact page</a> and we&apos;ll respond.
        </p>
      </section>
    </LegalPage>
  );
}
