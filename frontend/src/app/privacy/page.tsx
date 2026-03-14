import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — WrapEx",
  description: "How WrapEx handles your Spotify data, privacy rights, and data protection.",
};

export default function PrivacyPage() {
  return (
    <main className="pt-14">
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-text-muted mb-12">Last updated: March 14, 2026</p>

        <div className="space-y-10 text-text-secondary text-[15px] leading-relaxed">
          <Section title="1. What We Collect">
            <p>We collect the minimum data necessary to provide the Service:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-text-muted">
              <li>
                <strong className="text-text-secondary">Account info</strong> — email address and
                hashed password (we never store plaintext passwords)
              </li>
              <li>
                <strong className="text-text-secondary">Spotify data</strong> — your uploaded
                Extended Streaming History ZIP file, processed to generate dashboard analytics
              </li>
              <li>
                <strong className="text-text-secondary">Payment info</strong> — processed entirely
                by Stripe; we never see or store your card number
              </li>
              <li>
                <strong className="text-text-secondary">Usage data</strong> — basic request logs
                for security and debugging (IP addresses, timestamps)
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Spotify Data">
            <div className="bg-bg-card/60 border border-green/20 rounded-[var(--radius-card)] p-5 mt-2">
              <p className="text-text-primary font-medium mb-3">
                Your listening data is used exclusively to generate your dashboard.
              </p>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>We strip personally identifiable fields (like IP addresses) during ingestion</li>
                <li>We do not sell, rent, or share your data with third parties</li>
                <li>We do not use your data for advertising or profiling</li>
                <li>We do not train machine learning models on your data</li>
              </ul>
            </div>
          </Section>

          <Section title="3. Data Processing & Storage">
            <p>
              Your uploaded ZIP file is stored in encrypted object storage (S3-compatible). After
              processing, the raw file may be deleted. Your generated dashboard data is stored as
              long as your account exists.
            </p>
            <p className="mt-3">
              Processing happens on our servers via an automated pipeline. No human reviews your
              data unless you report a bug and explicitly share details with support.
            </p>
          </Section>

          <Section title="4. Data Retention">
            <p>
              Dashboard data is retained for as long as your account is active. You can request
              deletion of your account and all associated data at any time by contacting us.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-text-muted">
              <li>Uploaded ZIP files — deleted after processing completes</li>
              <li>Dashboard data — retained until account deletion</li>
              <li>Payment records — retained as required by law (typically 7 years)</li>
              <li>Server logs — automatically purged after 30 days</li>
            </ul>
          </Section>

          <Section title="5. Third-Party Services">
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-text-muted">
              <li>
                <strong className="text-text-secondary">Stripe</strong> — payment processing (
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green hover:underline"
                >
                  their privacy policy
                </a>
                )
              </li>
              <li>
                <strong className="text-text-secondary">Railway</strong> — application hosting and
                infrastructure
              </li>
              <li>
                <strong className="text-text-secondary">Cloudflare R2</strong> — encrypted file
                storage
              </li>
            </ul>
          </Section>

          <Section title="6. Cookies">
            <p>
              We use only essential cookies for authentication (JWT tokens stored in memory /
              localStorage). We do not use tracking cookies, analytics pixels, or any third-party
              tracking scripts.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>
              Depending on your jurisdiction (GDPR, CCPA, etc.), you may have the right to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-text-muted">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict processing of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us via our{" "}
              <Link href="/contact" className="text-green hover:underline">
                Contact page
              </Link>
              .
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We implement industry-standard security measures including encrypted storage,
              hashed passwords, HTTPS-only access, and JWT-based authentication with short-lived
              tokens. However, no system is 100% secure — use the Service at your own risk.
            </p>
          </Section>

          <Section title="9. Children">
            <p>
              WrapEx is not intended for users under 16 years of age. We do not knowingly collect
              data from children. If you believe a child has provided us with personal data, please
              contact us so we can delete it.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users
              of material changes via email. Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For privacy-related inquiries, reach out on our{" "}
              <Link href="/contact" className="text-green hover:underline">
                Contact page
              </Link>
              .
            </p>
          </Section>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-text-secondary transition-colors">
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
