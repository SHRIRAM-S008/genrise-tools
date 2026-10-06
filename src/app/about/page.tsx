import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/legal-page";

export const metadata = legalMetadata(
  "/about",
  "About GenRise",
  "Why we built a tools site where nothing is ever uploaded to a server."
);

export default function AboutPage() {
  return (
    <LegalPage title="About GenRise" updated="October 2026">
      <section>
        <h2>Why GenRise exists</h2>
        <p>
          It started with a familiar frustration: filling out a government or exam application
          form that demands a photo under exactly 50KB, a signature at exact pixel dimensions, and
          documents merged into one PDF — and every online tool either uploads your personal
          documents to a stranger&apos;s server, adds a watermark, or hides the result behind a
          paywall.
        </p>
        <p>
          So we built the alternative. GenRise is a collection of everyday file tools — image
          compression, PDF merging, exact-size photo preparation, QR codes, developer utilities —
          that run entirely in your browser. When you use GenRise, your files never leave your
          device. There is no upload step because there is no server to upload to.
        </p>
      </section>

      <section>
        <h2>One architectural rule</h2>
        <p>
          If your browser can do it, we don&apos;t need a server to do it for you. Modern browsers
          can compress images, render PDFs, read QR codes, and process audio entirely on-device.
          We lean on Canvas, WebAssembly, and the File API — the result is tools that are not just
          more private, but faster: no upload queue, no processing wait, no &ldquo;your file is
          ready&rdquo; email.
        </p>
      </section>

      <section>
        <h2>Who it&apos;s for</h2>
        <p>
          Students and job seekers preparing application documents. Developers who need a quick
          formatter or decoder. Anyone who wants a file task done without handing the file to a
          company. We organise the tools into <Link href="/tools">kits</Link> — CareerKit,
          StudentKit, PDFKit, and others — so the right tools are grouped around the job
          you&apos;re actually trying to finish.
        </p>
      </section>

      <section>
        <h2>Free means free</h2>
        <p>
          No accounts, no watermarks, no usage caps, no premium tier. The site is sustained by
          lightweight, clearly-labelled advertising and is open source —
          you can inspect exactly how every tool works on{" "}
          <a href="https://github.com/SHRIRAM-S008/Genrise-tools" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
      </section>
    </LegalPage>
  );
}
