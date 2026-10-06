/**
 * Comparison data for /alternatives/[slug] pages. Every claim about a
 * competitor must stay accurate — these reflect their widely-known public
 * behaviour (uploads required, free-tier limits, sign-up for some features).
 */

export interface Alternative {
  slug: string;
  competitor: string;
  /** What the competitor is best known for. */
  knownFor: string;
  intro: string;
  /** Comparison rows: [label, competitor value, GenRise value] */
  rows: [string, string, string][];
  /** GenRise tool slugs that cover the same jobs. */
  equivalentTools: string[];
  faqs: { question: string; answer: string }[];
}

const PRIVATE = "Never — runs in your browser";
const FREE_LIMITS = "No limits, no account";

export const alternatives: Alternative[] = [
  {
    slug: "ilovepdf-alternative",
    competitor: "iLovePDF",
    knownFor: "PDF merging, splitting, compression and conversion",
    intro:
      "iLovePDF is the biggest name in online PDF tools, but every job uploads your document to their servers and free accounts hit daily task and file-size limits. GenRise's PDFKit does the same core jobs — merge, split, compress, rotate, reorganise — entirely on your device.",
    rows: [
      ["Files uploaded to a server", "Yes — processed on their servers", PRIVATE],
      ["Account required", "For higher limits and premium tools", "Never"],
      ["Free-tier limits", "Task and file-size caps per day", FREE_LIMITS],
      ["Works offline", "No", "Yes — installable as an app"],
      ["Price", "Free tier + paid premium", "Free, no premium tier"],
    ],
    equivalentTools: ["merge-pdf", "split-pdf", "compress-pdf", "pdf-organizer", "rotate-pdf", "pdf-to-image", "image-to-pdf"],
    faqs: [
      {
        question: "Is GenRise really a free iLovePDF alternative?",
        answer: "Yes — the core PDF operations (merge, split, compress, rotate, organise, image conversion) are all free with no limits, and your files never leave your device.",
      },
      {
        question: "What can iLovePDF do that GenRise can't?",
        answer: "Features that genuinely need a server — OCR at scale, e-signing workflows, and some Office conversions — are where upload-based tools still win. For everyday PDF jobs, the browser is enough.",
      },
    ],
  },
  {
    slug: "smallpdf-alternative",
    competitor: "Smallpdf",
    knownFor: "PDF conversion, compression and editing",
    intro:
      "Smallpdf's free tier allows a handful of tasks per day before it asks for a subscription, and every file travels to their servers. GenRise covers the everyday PDF jobs with no daily caps and no uploads.",
    rows: [
      ["Files uploaded to a server", "Yes", PRIVATE],
      ["Free-tier limits", "Limited tasks per day", FREE_LIMITS],
      ["Account required", "To unlock more tasks", "Never"],
      ["Subscription", "Paid plans for full access", "None — everything is free"],
    ],
    equivalentTools: ["merge-pdf", "split-pdf", "compress-pdf", "pdf-to-image", "image-to-pdf", "pdf-to-word", "pdf-organizer"],
    faqs: [
      {
        question: "How is GenRise different from Smallpdf?",
        answer: "Two ways: processing happens in your browser instead of on a server, and there is no daily task limit or paywall — the tools are simply free.",
      },
    ],
  },
  {
    slug: "tinypng-alternative",
    competitor: "TinyPNG",
    knownFor: "Image compression (PNG, JPEG, WebP)",
    intro:
      "TinyPNG produces excellent compressed images, but each image uploads to their servers and the free web tool caps you at a handful of images per session. GenRise compresses images locally — including to an exact KB target, which TinyPNG doesn't offer — with no per-session cap.",
    rows: [
      ["Files uploaded to a server", "Yes", PRIVATE],
      ["Batch limits", "Free web tier is capped per session", "Batch mode, no cap"],
      ["Exact file-size targeting", "No", "Yes — UploadReady hits a KB target"],
      ["Account required", "API users need a key", "Never"],
    ],
    equivalentTools: ["compress-image", "target-kb", "resize-image", "convert-image"],
    faqs: [
      {
        question: "Is GenRise's compression as good as TinyPNG's?",
        answer: "TinyPNG's encoder is genuinely strong and may squeeze a few percent more on some images. GenRise's advantage is doing it privately, in batches, for free — and compressing to an exact KB limit for form uploads, which TinyPNG can't do.",
      },
    ],
  },
  {
    slug: "remove-bg-alternative",
    competitor: "remove.bg",
    knownFor: "Automatic background removal",
    intro:
      "remove.bg made background removal famous, but every image uploads to their API and full-resolution output requires paid credits. GenRise's Background Remover runs a model directly in your browser — free, unlimited, and your photo never leaves the device.",
    rows: [
      ["Files uploaded to a server", "Yes — sent to their API", PRIVATE],
      ["Resolution", "Preview free; full-res needs credits", "Full resolution, free"],
      ["Usage limits", "Credit-based", "Unlimited"],
      ["Works offline", "No", "Yes, after first load"],
    ],
    equivalentTools: ["background-remover"],
    faqs: [
      {
        question: "Is on-device background removal as accurate as remove.bg?",
        answer: "For typical portraits and product shots, yes — it runs a real segmentation model, just in your browser. Extremely fine detail (hair wisps on complex backgrounds) can favour remove.bg's larger server-side models.",
      },
    ],
  },
  {
    slug: "cloudconvert-alternative",
    competitor: "CloudConvert",
    knownFor: "File format conversion across many types",
    intro:
      "CloudConvert converts nearly everything, but files go to their servers and free use is limited to a daily quota of conversion minutes. For the everyday conversions — image formats, images-to-PDF, PDF-to-image — GenRise does the job locally with no quota.",
    rows: [
      ["Files uploaded to a server", "Yes", PRIVATE],
      ["Free-tier limits", "Daily conversion-minute quota", FREE_LIMITS],
      ["Supported formats", "Hundreds (server-side)", "Core formats — images, PDFs, media"],
      ["Account required", "For larger jobs", "Never"],
    ],
    equivalentTools: ["convert-image", "image-to-pdf", "pdf-to-image", "video-to-gif", "audio-trimmer"],
    faqs: [
      {
        question: "When should I use CloudConvert instead?",
        answer: "For rare or heavy formats a browser can't decode (e.g. some video codecs, CAD files), a server-side converter is the right tool. For standard image/PDF/media jobs, GenRise is faster and private.",
      },
    ],
  },
  {
    slug: "qrcode-monkey-alternative",
    competitor: "QRCode Monkey",
    knownFor: "Free QR code generation with logos",
    intro:
      "QRCode Monkey is a genuinely good free QR generator. GenRise's generator matches it on the essentials — static codes, colours, error-correction levels, PNG and SVG export — and adds camera-based scanning plus a guarantee that nothing you type touches a server, even briefly.",
    rows: [
      ["Static, never-expiring codes", "Yes", "Yes"],
      ["Data sent anywhere", "Codes are generated server-side", PRIVATE],
      ["Logo / colour customisation", "Yes", "Colours and error-correction levels"],
      ["SVG export for print", "Yes", "Yes"],
      ["QR scanning too", "No", "Yes — camera or image"],
    ],
    equivalentTools: ["qr-code", "qr-scanner"],
    faqs: [
      {
        question: "Does GenRise's QR generator add logos like QRCode Monkey?",
        answer: "Not yet — it focuses on reliable, spec-compliant codes with colour and error-correction control. A centre logo can be added separately by placing an image over a high-error-correction code.",
      },
    ],
  },
];

export function getAlternative(slug: string) {
  return alternatives.find((a) => a.slug === slug);
}
