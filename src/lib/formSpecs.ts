/**
 * Application-form photo/signature specifications for Indian exams, documents
 * and visas — the dataset behind the /forms/[slug] landing pages.
 *
 * ⚠️ DATA ACCURACY: values below are the widely-published requirements, but
 * every recruiting body revises them per notification cycle. Each entry carries
 * `verifiedFor` — re-check it against the current official notification before
 * each exam season. The pages themselves tell users to do the same.
 */

export interface FileSpec {
  minKb?: number;
  maxKb?: number;
  widthPx?: number;
  heightPx?: number;
  widthMm?: number;
  heightMm?: number;
  format?: string;
  background?: string;
  notes?: string;
}

export interface FormSpec {
  slug: string;
  name: string;
  shortName: string;
  authority: string;
  category: "exam" | "document" | "visa";
  /** One-line intent-matched headline keyword, e.g. "SSC CGL photo size". */
  keywords: string[];
  photo?: FileSpec;
  signature?: FileSpec;
  /** Other uploads the form asks for (thumb impressions, declarations…). */
  otherUploads?: { label: string; spec: string }[];
  /** The official notification/portal this data reflects. */
  sourceNote: string;
  verifiedFor: string;
  /** Plain-English prep steps, in order. */
  steps: string[];
  faqs: { question: string; answer: string }[];
}

function kbRange(s?: FileSpec): string {
  if (!s) return "";
  if (s.minKb && s.maxKb) return `${s.minKb}–${s.maxKb} KB`;
  if (s.maxKb) return `up to ${s.maxKb} KB`;
  if (s.minKb) return `at least ${s.minKb} KB`;
  return "";
}

export function photoSpecLine(s?: FileSpec): string {
  if (!s) return "";
  const parts: string[] = [];
  if (s.widthPx && s.heightPx) parts.push(`${s.widthPx}×${s.heightPx} px`);
  if (s.widthMm && s.heightMm) parts.push(`${s.widthMm}×${s.heightMm} mm`);
  const kb = kbRange(s);
  if (kb) parts.push(kb);
  if (s.format) parts.push(s.format);
  if (s.background) parts.push(`${s.background} background`);
  return parts.join(" · ");
}

export const formSpecs: FormSpec[] = [
  // ── SSC ─────────────────────────────────────────────────────────────
  {
    slug: "ssc-cgl",
    name: "SSC CGL (Combined Graduate Level)",
    shortName: "SSC CGL",
    authority: "Staff Selection Commission",
    category: "exam",
    keywords: ["ssc cgl photo size", "ssc cgl photo size in kb", "ssc cgl signature size", "ssc photo upload 20kb 50kb"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG", background: "light/white" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    sourceNote: "SSC CGL notification — online application portal specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Take a recent passport-style photo against a plain light background.",
      "Use UploadReady to compress it into the 20–50 KB window and set 200×230 px.",
      "Scan or photograph your signature on white paper, then use Signature Optimizer at 140×60 px, 10–20 KB.",
      "Merge any supporting certificates into one PDF with Merge PDF if the portal asks for a single upload.",
    ],
    faqs: [
      {
        question: "What is the SSC CGL photo size in KB?",
        answer: "The SSC portal typically requires a JPEG photo between 20 KB and 50 KB at roughly 200×230 pixels, on a light or white background.",
      },
      {
        question: "What is the SSC CGL signature size?",
        answer: "The signature is usually 10–20 KB in JPEG format at about 140×60 pixels, signed in black or blue ink on white paper.",
      },
      {
        question: "My photo is too large — how do I get it under 50 KB?",
        answer: "Use GenRise UploadReady: set the target to 50 KB and it compresses the photo to fit, without uploading it anywhere.",
      },
    ],
  },
  {
    slug: "ssc-chsl",
    name: "SSC CHSL (Combined Higher Secondary)",
    shortName: "SSC CHSL",
    authority: "Staff Selection Commission",
    category: "exam",
    keywords: ["ssc chsl photo size", "ssc chsl photo size in kb", "ssc chsl signature size in kb"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG", background: "light/white" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    sourceNote: "SSC CHSL notification — online application portal specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport-style photo on a light background.",
      "Compress it to 20–50 KB at 200×230 px with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB, with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "Is the SSC CHSL photo spec the same as SSC CGL?",
        answer: "Yes — SSC uses the same upload specification across its exams: photo 20–50 KB JPEG (~200×230 px) and signature 10–20 KB JPEG (~140×60 px). Confirm against your current notification.",
      },
    ],
  },
  {
    slug: "ssc-gd",
    name: "SSC GD Constable",
    shortName: "SSC GD",
    authority: "Staff Selection Commission",
    category: "exam",
    keywords: ["ssc gd photo size", "ssc gd constable photo size in kb", "ssc gd signature size"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG", background: "light/white" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    sourceNote: "SSC GD Constable notification — online application portal specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport-style photo on a light background.",
      "Compress it to 20–50 KB at 200×230 px with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB, with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What size photo does SSC GD need?",
        answer: "The SSC portal typically asks for a 20–50 KB JPEG photo at roughly 200×230 pixels. Always confirm in the current GD Constable notification.",
      },
    ],
  },
  {
    slug: "ssc-mts",
    name: "SSC MTS",
    shortName: "SSC MTS",
    authority: "Staff Selection Commission",
    category: "exam",
    keywords: ["ssc mts photo size", "ssc mts photo size in kb", "ssc mts signature size"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG", background: "light/white" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    sourceNote: "SSC MTS notification — online application portal specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport-style photo on a light background.",
      "Compress it to 20–50 KB at 200×230 px with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB, with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What is the SSC MTS photo size?",
        answer: "SSC applications typically require a JPEG photo of 20–50 KB (~200×230 px) and a JPEG signature of 10–20 KB (~140×60 px).",
      },
    ],
  },

  // ── UPSC ────────────────────────────────────────────────────────────
  {
    slug: "upsc-cse",
    name: "UPSC Civil Services (IAS) Exam",
    shortName: "UPSC CSE",
    authority: "Union Public Service Commission",
    category: "exam",
    keywords: ["upsc photo size", "upsc photo size in kb", "upsc signature size", "ias form photo upload"],
    photo: { minKb: 20, maxKb: 300, format: "JPEG", background: "white", notes: "Recent passport-style photo; face clearly visible." },
    signature: { minKb: 20, maxKb: 300, format: "JPEG" },
    sourceNote: "UPSC online application instructions",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a clear passport-style photo on a white background.",
      "If your file exceeds the limit, compress it with UploadReady to fit the 20–300 KB window.",
      "Prepare the signature image the same way with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What is the UPSC photo size limit?",
        answer: "The UPSC portal generally accepts JPEG photos between 20 KB and 300 KB. The exact window is printed in the instructions for each exam — check your notification.",
      },
    ],
  },

  // ── NTA exams ───────────────────────────────────────────────────────
  {
    slug: "neet-ug",
    name: "NEET-UG",
    shortName: "NEET",
    authority: "National Testing Agency",
    category: "exam",
    keywords: ["neet photo size", "neet photo size in kb", "neet signature size", "neet postcard photo size"],
    photo: { minKb: 10, maxKb: 200, format: "JPG", background: "white" },
    signature: { minKb: 4, maxKb: 30, format: "JPG" },
    otherUploads: [
      { label: "Postcard-size photo", spec: "4×6 inch print, JPG 10–200 KB" },
      { label: "Thumb/finger impression", spec: "JPG 10–200 KB" },
      { label: "Category / documents", spec: "PDF 50–300 KB" },
    ],
    sourceNote: "NEET-UG information bulletin — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Take a passport photo on a white background (colour, recent).",
      "Compress it to the 10–200 KB window with UploadReady.",
      "Scan the signature in black ink and size it to 4–30 KB with Signature Optimizer.",
      "Compress certificates to PDF under the portal limit with Compress PDF.",
    ],
    faqs: [
      {
        question: "What is the NEET photo size in KB?",
        answer: "The NTA bulletin typically asks for a JPG photo between 10 KB and 200 KB, taken on a white background.",
      },
      {
        question: "What is the NEET signature size?",
        answer: "The signature is usually 4–30 KB in JPG format, signed with a black pen on white paper.",
      },
    ],
  },
  {
    slug: "jee-main",
    name: "JEE Main",
    shortName: "JEE Main",
    authority: "National Testing Agency",
    category: "exam",
    keywords: ["jee main photo size", "jee main photo size in kb", "jee signature size in kb"],
    photo: { minKb: 10, maxKb: 200, format: "JPG", background: "white" },
    signature: { minKb: 4, maxKb: 30, format: "JPG" },
    sourceNote: "JEE Main information bulletin — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport photo on a white background.",
      "Compress it to 10–200 KB with UploadReady.",
      "Size the signature to 4–30 KB with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What is the JEE Main photo size?",
        answer: "NTA applications for JEE Main typically accept a JPG photo of 10–200 KB and a JPG signature of 4–30 KB.",
      },
    ],
  },
  {
    slug: "cuet-ug",
    name: "CUET-UG",
    shortName: "CUET",
    authority: "National Testing Agency",
    category: "exam",
    keywords: ["cuet photo size", "cuet photo size in kb", "cuet signature size"],
    photo: { minKb: 10, maxKb: 200, format: "JPG", background: "white" },
    signature: { minKb: 4, maxKb: 30, format: "JPG" },
    sourceNote: "CUET-UG information bulletin — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport photo on a white background.",
      "Compress it to 10–200 KB with UploadReady.",
      "Size the signature to 4–30 KB with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "Is CUET's photo spec the same as NEET's?",
        answer: "Both are NTA exams and typically share the same upload windows: JPG photo 10–200 KB and JPG signature 4–30 KB. Verify in the current bulletin.",
      },
    ],
  },
  {
    slug: "gate",
    name: "GATE",
    shortName: "GATE",
    authority: "IIT (organising institute)",
    category: "exam",
    keywords: ["gate photo size", "gate photo size in kb", "gate signature size", "gate application photo upload"],
    photo: { minKb: 5, maxKb: 200, format: "JPEG", background: "white", notes: "Passport-style colour photo." },
    signature: { minKb: 5, maxKb: 150, format: "JPEG" },
    sourceNote: "GATE application portal (GOAPS) specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare a passport-style photo on a white background.",
      "Compress it within the portal's KB window with UploadReady.",
      "Size the signature with Signature Optimizer to fit the signature limit.",
    ],
    faqs: [
      {
        question: "What photo size does the GATE application need?",
        answer: "GOAPS typically accepts a JPEG photo roughly between 5 KB and 200 KB, and a JPEG signature up to about 150 KB. The exact limits appear in your year's brochure.",
      },
    ],
  },

  // ── Banking ─────────────────────────────────────────────────────────
  {
    slug: "ibps-po",
    name: "IBPS PO",
    shortName: "IBPS PO",
    authority: "Institute of Banking Personnel Selection",
    category: "exam",
    keywords: ["ibps po photo size", "ibps photo size in kb", "ibps signature size", "ibps thumb impression size", "ibps handwritten declaration size"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG", notes: "Black ink on white paper; not in capitals." },
    otherUploads: [
      { label: "Left thumb impression", spec: "JPEG 20–50 KB, ~240×240 px" },
      { label: "Handwritten declaration", spec: "JPEG 50–100 KB, ~800×400 px" },
    ],
    sourceNote: "IBPS CRP notification — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare the photo at 200×230 px, 20–50 KB with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB with Signature Optimizer.",
      "Size the thumb impression (240×240 px, 20–50 KB) and declaration (800×400 px, 50–100 KB) the same way — UploadReady handles exact KB targets.",
    ],
    faqs: [
      {
        question: "What is the IBPS photo and signature size?",
        answer: "IBPS portals typically require a photo of 20–50 KB (~200×230 px), a signature of 10–20 KB (~140×60 px), a thumb impression of 20–50 KB, and a handwritten declaration of 50–100 KB.",
      },
      {
        question: "How do I write the IBPS handwritten declaration?",
        answer: "Write the exact declaration text from the notification in your own handwriting on white paper, scan or photograph it, and compress it to 50–100 KB.",
      },
    ],
  },
  {
    slug: "ibps-clerk",
    name: "IBPS Clerk",
    shortName: "IBPS Clerk",
    authority: "Institute of Banking Personnel Selection",
    category: "exam",
    keywords: ["ibps clerk photo size", "ibps clerk photo size in kb", "ibps clerk signature size"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    otherUploads: [
      { label: "Left thumb impression", spec: "JPEG 20–50 KB, ~240×240 px" },
      { label: "Handwritten declaration", spec: "JPEG 50–100 KB, ~800×400 px" },
    ],
    sourceNote: "IBPS CRP Clerk notification — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare the photo at 200×230 px, 20–50 KB with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB with Signature Optimizer.",
      "Size the thumb impression and declaration with UploadReady.",
    ],
    faqs: [
      {
        question: "What is the IBPS Clerk photo size?",
        answer: "IBPS Clerk applications use the standard IBPS spec: photo JPEG 20–50 KB (~200×230 px), signature JPEG 10–20 KB (~140×60 px).",
      },
    ],
  },
  {
    slug: "sbi-po",
    name: "SBI PO",
    shortName: "SBI PO",
    authority: "State Bank of India",
    category: "exam",
    keywords: ["sbi po photo size", "sbi po photo size in kb", "sbi po signature size"],
    photo: { minKb: 20, maxKb: 50, widthPx: 200, heightPx: 230, format: "JPEG" },
    signature: { minKb: 10, maxKb: 20, widthPx: 140, heightPx: 60, format: "JPEG" },
    sourceNote: "SBI PO recruitment notification — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Prepare the photo at 200×230 px, 20–50 KB with UploadReady.",
      "Prepare the signature at 140×60 px, 10–20 KB with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What is the SBI PO photo size?",
        answer: "SBI recruitment typically requires a JPEG photo of 20–50 KB (~200×230 px) and a signature of 10–20 KB (~140×60 px).",
      },
    ],
  },

  // ── Railways ────────────────────────────────────────────────────────
  {
    slug: "rrb-ntpc",
    name: "RRB NTPC",
    shortName: "RRB NTPC",
    authority: "Railway Recruitment Board",
    category: "exam",
    keywords: ["rrb ntpc photo size", "rrb photo size in kb", "rrb signature size", "railway form photo upload"],
    photo: { maxKb: 50, widthMm: 35, heightMm: 45, format: "JPEG", background: "light" },
    signature: { maxKb: 50, format: "JPEG" },
    sourceNote: "RRB application portal specification",
    verifiedFor: "2025 cycle",
    steps: [
      "Crop to 35×45 mm with Passport Photo Maker.",
      "Compress under 50 KB with UploadReady.",
      "Prepare the signature JPEG under 50 KB with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What photo size does RRB NTPC need?",
        answer: "RRB portals typically ask for a JPEG photo up to 50 KB at 35×45 mm, plus a JPEG signature. Limits vary slightly between notifications — check yours.",
      },
    ],
  },

  // ── Teaching / state exams ──────────────────────────────────────────
  {
    slug: "ctet",
    name: "CTET",
    shortName: "CTET",
    authority: "Central Board of Secondary Education",
    category: "exam",
    keywords: ["ctet photo size", "ctet photo size in kb", "ctet signature size"],
    photo: { minKb: 10, maxKb: 100, format: "JPG" },
    signature: { minKb: 5, maxKb: 50, format: "JPG" },
    sourceNote: "CTET information bulletin — document upload specifications",
    verifiedFor: "2025 cycle",
    steps: [
      "Compress the photo into the 10–100 KB window with UploadReady.",
      "Size the signature to 5–50 KB with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What is the CTET photo size?",
        answer: "CTET typically accepts a JPG photo of 10–100 KB and a JPG signature of 5–50 KB.",
      },
    ],
  },
  {
    slug: "uppsc",
    name: "UPPSC (UP State Services)",
    shortName: "UPPSC",
    authority: "Uttar Pradesh Public Service Commission",
    category: "exam",
    keywords: ["uppsc photo size", "uppsc photo size in kb", "uppsc signature size"],
    photo: { maxKb: 100, format: "JPEG", background: "light" },
    signature: { maxKb: 50, format: "JPEG" },
    sourceNote: "UPPSC online application instructions",
    verifiedFor: "2025 cycle",
    steps: [
      "Compress the photo under the portal limit with UploadReady.",
      "Size the signature with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What photo size does UPPSC require?",
        answer: "UPPSC generally accepts a JPEG photo up to about 100 KB and a signature up to about 50 KB. Exact limits are in the advertisement for each post.",
      },
    ],
  },
  {
    slug: "tnpsc",
    name: "TNPSC",
    shortName: "TNPSC",
    authority: "Tamil Nadu Public Service Commission",
    category: "exam",
    keywords: ["tnpsc photo size", "tnpsc photo size in kb", "tnpsc signature size"],
    photo: { maxKb: 50, format: "JPEG", background: "light" },
    signature: { maxKb: 30, format: "JPEG" },
    sourceNote: "TNPSC online application instructions",
    verifiedFor: "2025 cycle",
    steps: [
      "Compress the photo under the portal limit with UploadReady.",
      "Size the signature with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What photo size does TNPSC require?",
        answer: "TNPSC applications commonly accept a JPEG photo up to ~50 KB and a signature up to ~30 KB — confirm against the current notification.",
      },
    ],
  },
  {
    slug: "mpsc",
    name: "MPSC",
    shortName: "MPSC",
    authority: "Maharashtra Public Service Commission",
    category: "exam",
    keywords: ["mpsc photo size", "mpsc photo size in kb", "mpsc signature size"],
    photo: { maxKb: 50, format: "JPEG", background: "light" },
    signature: { maxKb: 30, format: "JPEG" },
    sourceNote: "MPSC online application instructions",
    verifiedFor: "2025 cycle",
    steps: [
      "Compress the photo under the portal limit with UploadReady.",
      "Size the signature with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What photo size does MPSC require?",
        answer: "MPSC applications commonly accept a JPEG photo up to ~50 KB and a signature up to ~30 KB — verify in the current advertisement.",
      },
    ],
  },

  // ── Indian documents ────────────────────────────────────────────────
  {
    slug: "indian-passport-photo",
    name: "Indian Passport Photo",
    shortName: "Indian passport",
    authority: "Passport Seva, Ministry of External Affairs",
    category: "document",
    keywords: ["indian passport photo size", "passport photo size india", "passport size photo mm india", "passport seva photo upload"],
    photo: { widthMm: 51, heightMm: 51, background: "white", format: "JPEG", notes: "Face should cover 25–35 mm of the photo height." },
    sourceNote: "Passport Seva photo guidelines",
    verifiedFor: "2025",
    steps: [
      "Crop your portrait to 51×51 mm (2×2 inch) with Passport Photo Maker — pick the US Passport preset, which is the same 2×2 inch size.",
      "Keep a plain white background; the maker lets you fill the background colour.",
      "If a portal asks for a file-size limit too, finish with UploadReady.",
    ],
    faqs: [
      {
        question: "What is the Indian passport photo size?",
        answer: "2×2 inches (51×51 mm) with a white background — larger than the 35×45 mm size used for Schengen visas. The face should occupy 25–35 mm of the height.",
      },
      {
        question: "Is Indian passport photo size 35×45 or 51×51?",
        answer: "Officially 51×51 mm (2×2 inch). The 35×45 mm size is used by Schengen/UK visas and some Indian state documents — a common point of confusion.",
      },
    ],
  },
  {
    slug: "pan-card-photo",
    name: "PAN Card Photo",
    shortName: "PAN card",
    authority: "NSDL / Protean eGov",
    category: "document",
    keywords: ["pan card photo size", "pan card photo size in kb", "pan card signature size", "pan photo upload size"],
    photo: { widthMm: 25, heightMm: 35, format: "JPEG", background: "white" },
    signature: { widthMm: 20, heightMm: 45, format: "JPEG", notes: "Signed inside the box, black ink." },
    sourceNote: "PAN application guidelines (NSDL/UTIITSL)",
    verifiedFor: "2025",
    steps: [
      "Crop the photo to 25×35 mm with Passport Photo Maker using a custom size.",
      "Prepare the signature (~20×45 mm) with Signature Optimizer.",
      "Compress both under the portal's KB limit with UploadReady.",
    ],
    faqs: [
      {
        question: "What size is a PAN card photo?",
        answer: "25×35 mm with a white background — the same size the physical form asks you to affix.",
      },
    ],
  },
  {
    slug: "aadhaar-photo",
    name: "Aadhaar Photo & Document Uploads",
    shortName: "Aadhaar",
    authority: "UIDAI",
    category: "document",
    keywords: ["aadhaar photo size", "aadhaar document upload size", "aadhaar update document pdf size"],
    photo: { format: "JPEG", notes: "Aadhaar enrolment photos are captured at the centre; for online document updates the portal accepts PDF/JPEG uploads." },
    otherUploads: [
      { label: "Proof documents (online update)", spec: "PDF/JPEG, typically under 1 MB per file" },
    ],
    sourceNote: "UIDAI myAadhaar portal guidance",
    verifiedFor: "2025",
    steps: [
      "Convert scanned documents to PDF with Image to PDF.",
      "Compress each PDF under the portal limit with Compress PDF.",
      "If a photo upload is needed, size it with UploadReady.",
    ],
    faqs: [
      {
        question: "What file size does the Aadhaar update portal accept?",
        answer: "The myAadhaar portal accepts PDF or JPEG proof documents, generally up to about 1 MB each. Compress larger scans before uploading.",
      },
    ],
  },

  // ── Visas & international ───────────────────────────────────────────
  {
    slug: "us-visa-photo",
    name: "US Visa (DS-160) Photo",
    shortName: "US visa",
    authority: "US Department of State",
    category: "visa",
    keywords: ["us visa photo size", "ds-160 photo size", "us visa photo 2x2", "us visa photo size in kb"],
    photo: { widthMm: 51, heightMm: 51, widthPx: 600, heightPx: 600, maxKb: 240, format: "JPEG", background: "white" },
    sourceNote: "US Department of State photo requirements (DS-160)",
    verifiedFor: "2025",
    steps: [
      "Crop to 51×51 mm (2×2 inch) — the US Passport preset in Passport Photo Maker is exactly this.",
      "Export at 600×600 px or larger.",
      "Compress under 240 KB with UploadReady if needed.",
    ],
    faqs: [
      {
        question: "What is the US visa photo size for DS-160?",
        answer: "2×2 inches (51×51 mm), minimum 600×600 pixels, JPEG format, maximum 240 KB, on a plain white background.",
      },
    ],
  },
  {
    slug: "schengen-visa-photo",
    name: "Schengen Visa Photo",
    shortName: "Schengen visa",
    authority: "Schengen member states",
    category: "visa",
    keywords: ["schengen visa photo size", "schengen photo 35x45", "europe visa photo size"],
    photo: { widthMm: 35, heightMm: 45, format: "JPEG", background: "light grey/white", notes: "Face covers 70–80% of the photo height." },
    sourceNote: "ICAO-aligned Schengen visa photo specification",
    verifiedFor: "2025",
    steps: [
      "Crop to 35×45 mm with Passport Photo Maker — the Schengen Visa preset is built in.",
      "Use a plain light background; the maker fills it for you.",
      "Print copies with Print Sheet Maker if the consulate wants physical photos.",
    ],
    faqs: [
      {
        question: "What size is a Schengen visa photo?",
        answer: "35×45 mm on a light background, with the face covering 70–80% of the height — the ICAO standard size across Europe.",
      },
    ],
  },
  {
    slug: "uk-visa-photo",
    name: "UK Visa Photo",
    shortName: "UK visa",
    authority: "UK Visas and Immigration",
    category: "visa",
    keywords: ["uk visa photo size", "uk visa photo 35x45", "uk visa digital photo requirements"],
    photo: { widthMm: 35, heightMm: 45, format: "JPEG", background: "plain light" },
    sourceNote: "UKVI photo requirements",
    verifiedFor: "2025",
    steps: [
      "Crop to 35×45 mm with Passport Photo Maker.",
      "Use a plain light-coloured background.",
    ],
    faqs: [
      {
        question: "What size photo does a UK visa need?",
        answer: "35×45 mm on a plain light background — the same dimensions as Schengen, so the Schengen preset works.",
      },
    ],
  },
  {
    slug: "oci-card-photo",
    name: "OCI Card Photo",
    shortName: "OCI card",
    authority: "Ministry of Home Affairs / VFS",
    category: "document",
    keywords: ["oci photo size", "oci card photo 2x2", "oci signature upload size"],
    photo: { widthMm: 51, heightMm: 51, format: "JPEG", background: "light", notes: "Same 2×2 inch size as US/Indian passport photos." },
    signature: { notes: "Signature/thumb impression image uploaded separately on the OCI portal." },
    sourceNote: "OCI application photo specifications",
    verifiedFor: "2025",
    steps: [
      "Crop to 51×51 mm (2×2 inch) with the US Passport preset in Passport Photo Maker.",
      "Prepare the signature image with Signature Optimizer.",
    ],
    faqs: [
      {
        question: "What size is an OCI card photo?",
        answer: "2×2 inches (51×51 mm) on a light background — identical to the US passport size.",
      },
    ],
  },
  {
    slug: "passport-size-photo",
    name: "Passport-Size Photo (Generic)",
    shortName: "passport-size photo",
    authority: "General",
    category: "document",
    keywords: ["passport size photo", "passport size photo in mm", "passport size photo maker online", "make passport size photo free"],
    photo: { widthMm: 35, heightMm: 45, format: "JPEG", background: "white", notes: "The most common 'passport size' in India is 35×45 mm; Indian passports themselves use 51×51 mm." },
    sourceNote: "Common usage across forms and studios",
    verifiedFor: "2025",
    steps: [
      "Crop to 35×45 mm (or whatever the form states) with Passport Photo Maker.",
      "Fill the background to white in the same tool.",
      "Print multiple copies on one sheet with Print Sheet Maker.",
    ],
    faqs: [
      {
        question: "What exactly is 'passport size' in India?",
        answer: "For most forms it means 35×45 mm. Indian passports themselves officially need 51×51 mm (2×2 inch), so always match the size printed in your form's instructions.",
      },
    ],
  },
];

export const formCategories: { id: FormSpec["category"]; label: string; blurb: string }[] = [
  { id: "exam", label: "Exam applications", blurb: "Photo, signature and document specs for SSC, UPSC, NTA, banking and state exams." },
  { id: "document", label: "Indian documents", blurb: "Passport, PAN card, OCI and Aadhaar photo and upload requirements." },
  { id: "visa", label: "Visas", blurb: "Photo requirements for US, Schengen and UK visa applications." },
];

export function getFormSpec(slug: string) {
  return formSpecs.find((s) => s.slug === slug);
}

/** Builds the deep link into a tool with prefilled parameters. */
export function toolHref(tool: "target-kb" | "passport-photo" | "signature-optimizer", spec: FileSpec): string {
  const p = new URLSearchParams();
  if (tool === "target-kb") {
    if (spec.maxKb) p.set("kb", String(spec.maxKb));
    if (spec.widthPx) p.set("w", String(spec.widthPx));
    if (spec.heightPx) p.set("h", String(spec.heightPx));
    if (spec.format === "JPEG" || spec.format === "JPG") p.set("format", "jpg");
  }
  if (tool === "signature-optimizer") {
    if (spec.maxKb) p.set("kb", String(spec.maxKb));
    if (spec.widthPx) p.set("w", String(spec.widthPx));
    if (spec.heightPx) p.set("h", String(spec.heightPx));
    if (spec.format === "JPEG" || spec.format === "JPG") p.set("format", "jpg");
    else p.set("format", "png");
  }
  if (tool === "passport-photo") {
    if (spec.widthMm === 51 && spec.heightMm === 51) p.set("size", "passport-us");
    else if (spec.widthMm === 35 && spec.heightMm === 45) p.set("size", "passport-eu");
    else if (spec.widthMm && spec.heightMm) {
      p.set("size", "custom");
      p.set("wmm", String(spec.widthMm));
      p.set("hmm", String(spec.heightMm));
    }
    if (spec.maxKb) p.set("kb", String(spec.maxKb));
  }
  const q = p.toString();
  return `/tools/${tool}${q ? `?${q}` : ""}`;
}
