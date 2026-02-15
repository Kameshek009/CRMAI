import Link from "next/link";
import { PublicAuthHeader } from "@/components/public-auth-header";
import { FooterSection } from "@/components/landing/footer-section";

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Security</h1>
        <p className="text-sm text-muted-foreground mb-8">How we protect your data</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Infrastructure</h2>
            <p className="text-muted-foreground leading-relaxed">
              NexusCRM is hosted on enterprise-grade cloud infrastructure with automatic scaling, redundancy, and 99.9% uptime SLA. All services run in isolated environments with strict network policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Encryption</h2>
            <p className="text-muted-foreground leading-relaxed">
              All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. API keys and sensitive credentials are stored using industry-standard secret management.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Authentication</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Clerk for authentication, providing secure sign-in with support for multi-factor authentication (MFA), social login, and enterprise SSO. Session tokens are short-lived and automatically rotated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Database Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our database uses Supabase with Row Level Security (RLS) policies ensuring users can only access their own data. All queries are parameterized to prevent SQL injection attacks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">AI Data Handling</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your CRM data processed by our AI features is not used to train AI models. AI conversations and insights are scoped to your account and are not shared across users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Reporting Vulnerabilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you discover a security vulnerability, please report it responsibly through your account dashboard. We take all reports seriously and will respond promptly.
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
