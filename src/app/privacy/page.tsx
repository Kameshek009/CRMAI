import Link from "next/link";
import { PublicAuthHeader } from "@/components/public-auth-header";
import { FooterSection } from "@/components/landing/footer-section";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly, such as your name, email address, and company details when you create an account. We also collect usage data including how you interact with our CRM features, AI assistant, and analytics tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to provide and improve our CRM services, personalize your experience, deliver AI-powered insights, process transactions, and communicate with you about your account and our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption. We use Supabase for database management with row-level security policies. All data transfers are encrypted via TLS/SSL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share data with service providers who help us operate our platform (payment processing, authentication, AI services) under strict confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, update, or delete your personal data at any time through your account settings. You can export your CRM data or request complete account deletion by contacting our support team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics cookies help us understand usage patterns to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through your dashboard or email our privacy team.
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
