import Link from "next/link";
import { PublicAuthHeader } from "@/components/public-auth-header";
import { FooterSection } from "@/components/landing/footer-section";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using NexusCRM, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              NexusCRM provides a cloud-based customer relationship management platform with AI-powered features including contact management, deal pipeline tracking, task management, analytics, and an AI chat assistant.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscription & Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Free accounts have usage limits. Paid subscriptions (Starter, Pro, Enterprise) are billed monthly per user. You can upgrade, downgrade, or cancel at any time. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to misuse our services, including attempting unauthorized access, transmitting malicious code, or using the platform for illegal activities. We reserve the right to suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data you upload to NexusCRM. We do not claim ownership of your contacts, deals, notes, or any other content. You can export or delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              NexusCRM is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes via email or through the platform. Continued use after changes constitutes acceptance.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
