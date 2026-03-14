import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — WrapEx",
  description: "Terms of Service for WrapEx, the Spotify Extended Streaming History dashboard.",
};

export default function TermsPage() {
  return (
    <main className="pt-14">
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-text-muted mb-12">Last updated: March 14, 2026</p>

        <div className="space-y-10 text-text-secondary text-[15px] leading-relaxed">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using WrapEx (&quot;the Service&quot;), you agree to be bound by
              these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              WrapEx is a web application that processes your Spotify Extended Streaming History
              export file and generates a personalized analytics dashboard. You upload a{" "}
              <code className="text-green text-sm">.zip</code> file exported from Spotify, and we
              process it to produce visualizations and insights about your listening habits.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              You must create an account to use the Service. You are responsible for maintaining the
              confidentiality of your credentials and for all activity under your account. You agree
              to provide accurate information and to notify us immediately of any unauthorized use.
            </p>
          </Section>

          <Section title="4. Payments & Refunds">
            <p>
              Dashboard generation requires a one-time payment processed through Stripe. All
              payments are final. If processing fails due to a system error, you may contact us for
              a refund or credit. We do not store your payment card details — all payment processing
              is handled by{" "}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                Stripe
              </a>
              .
            </p>
          </Section>

          <Section title="5. User Data & Uploads">
            <p>
              You retain ownership of your Spotify data. By uploading, you grant WrapEx a limited
              license to process your data solely for generating your dashboard. We do not sell,
              share, or use your listening data for any purpose other than providing the Service.
            </p>
            <p className="mt-3">
              Uploaded files are stored temporarily for processing and may be deleted after your
              dashboard is generated. See our{" "}
              <Link href="/privacy" className="text-green hover:underline">
                Privacy Policy
              </Link>{" "}
              for full details on data handling.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-text-muted">
              <li>Upload files that are not legitimate Spotify data exports</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service</li>
              <li>Use the Service to violate any applicable law or regulation</li>
              <li>Share your account credentials with others</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The Service, including its design, code, and branding, is owned by WrapEx. Your
              generated dashboards are yours to keep and share. The public sharing feature allows
              others to view your dashboard via a unique link — you control this setting.
            </p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. We do not
              guarantee that dashboards will be error-free, that processing will always succeed, or
              that the Service will be available without interruption.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, WrapEx shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the Service. Our total
              liability is limited to the amount you paid for the specific dashboard in question.
            </p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>
              We may update these Terms at any time. Continued use of the Service after changes
              constitutes acceptance. We will notify registered users of material changes via email.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about these Terms? Reach out on our{" "}
              <Link href="/contact" className="text-green hover:underline">
                Contact page
              </Link>
              .
            </p>
          </Section>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <FooterLinks />
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

function FooterLinks() {
  return (
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
  );
}
