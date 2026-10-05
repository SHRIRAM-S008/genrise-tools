import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { SearchOverlayProvider } from "@/components/search-overlay";
import { AmbientBackground } from "@/components/ambient-background";
import { RegisterServiceWorker } from "@/components/register-sw";
import { InstallPrompt } from "@/components/install-prompt";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { siteUrl, siteName, siteTagline } from "@/lib/toolSeo";
import { tools } from "@/lib/tools";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const title = `${siteName} — ${siteTagline}`;
const description =
  "Free online tools to compress, convert, merge, and organize images, PDFs, and documents — 100% private, no sign-up, and nothing is ever uploaded to a server.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "free online tools",
    "compress pdf",
    "compress image",
    "merge pdf",
    "convert image",
    "resize image",
    "browser based tools",
    "no upload file tools",
    "privacy friendly file tools",
    "online file tools",
    "image compressor",
    "pdf tools online",
    "qr code generator",
    "invoice generator",
    "csv to json converter",
    "metadata remover",
    "passport photo maker",
    "zip creator online",
    "text tools online",
    "free pdf organizer",
    "image to pdf converter",
    "genrise",
    "genrisetech",
  ],
  applicationName: siteName,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: siteUrl },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/logo.avif",
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/logo.avif"],
  },
  authors: [{ name: "GenRise Tech" }],
  creator: "GenRise Tech",
  publisher: "GenRise Tech",
  category: "technology",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },
  other: {
    "ai:site-name": siteName,
    "ai:site-type": "tools",
    "ai:privacy": "on-device",
    "ai:pricing": "free",
    "format-detection": "telephone=no",
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  description,
  logo: `${siteUrl}/logo.png`,
  sameAs: [
    "https://github.com/SHRIRAM-S008/Genrise-tools",
    "https://www.linkedin.com/company/genrise-tech/",
  ],
};

// No SearchAction: Google retired the sitelinks search box rich result in
// October 2024, and the target here never resolved to a real search endpoint.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description,
  sameAs: "https://github.com/SHRIRAM-S008/Genrise-tools",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${siteName} Tools`,
  description: "Complete list of free browser-based tools available on GenRise",
  url: `${siteUrl}/tools`,
  numberOfItems: tools.length,
  itemListElement: tools.map((tool, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: tool.title,
    url: `${siteUrl}/tools/${tool.slug}`,
  })),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
        <PwaInstallProvider>
          <RegisterServiceWorker />
          <AmbientBackground />
          <SearchOverlayProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
            <BottomNav />
            <InstallPrompt />
          </SearchOverlayProvider>
        </PwaInstallProvider>
      </body>
    </html>
  );
}
