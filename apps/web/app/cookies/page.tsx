import { LegalDocNav } from "@/components/legal-doc-nav";

export const metadata = { title: "Cookie Policy — ASAP Local" };

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ASAP Local — Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: 11 September 2026</p>

      <LegalDocNav current="/cookies" />

      <div className="prose prose-sm max-w-none text-muted-foreground">
        <h2>1. What are cookies?</h2>
        <p>Cookies are small files placed on your device when you visit a website. They help websites remember information and operate correctly.</p>
        <p>ASAP Local may also use similar technologies such as pixels, SDKs and local storage.</p>

        <h2>2. Types of cookies</h2>
        <h3>Essential cookies</h3>
        <p>These are necessary for the platform to function. They may support:</p>
        <ul>
          <li>Login</li>
          <li>Account security</li>
          <li>Session management</li>
          <li>Payment processes</li>
          <li>Fraud prevention</li>
          <li>Accessibility</li>
          <li>Core functionality</li>
        </ul>
        <p>These cannot generally be disabled through our cookie preference tool where they are strictly necessary.</p>

        <h3>Preference cookies</h3>
        <p>These remember choices such as:</p>
        <ul>
          <li>Language</li>
          <li>Region</li>
          <li>Display preferences</li>
        </ul>

        <h3>Analytics cookies</h3>
        <p>These help us understand:</p>
        <ul>
          <li>Which pages are used</li>
          <li>How users navigate the platform</li>
          <li>Performance</li>
          <li>Errors</li>
          <li>Feature usage</li>
        </ul>

        <h3>Marketing cookies</h3>
        <p>Where used, these may help us:</p>
        <ul>
          <li>Measure advertising</li>
          <li>Understand campaigns</li>
          <li>Show relevant advertising</li>
          <li>Measure conversions</li>
        </ul>
        <p>Non-essential cookies will be used in accordance with applicable consent requirements.</p>

        <h2>3. Third-party technologies</h2>
        <p>We may use services from third parties for:</p>
        <ul>
          <li>Analytics</li>
          <li>Payments</li>
          <li>Fraud prevention</li>
          <li>Advertising</li>
          <li>Customer support</li>
          <li>Authentication</li>
        </ul>
        <p>Those providers may use their own cookies or similar technologies.</p>

        <h2>4. Managing cookies</h2>
        <p>You can manage cookies through:</p>
        <ul>
          <li>Our cookie preference centre</li>
          <li>Your browser</li>
          <li>Device settings</li>
        </ul>
        <p>Disabling essential cookies may prevent parts of ASAP Local from working.</p>

        <h2>5. Changes</h2>
        <p>We may update this Cookie Policy when our technologies or legal obligations change.</p>
      </div>
    </div>
  );
}
