import { LegalDocNav } from "@/components/legal-doc-nav";

export const metadata = { title: "Accessibility Statement — ASAP Local" };

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ASAP Local — Accessibility Statement</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: 11 September 2026</p>

      <LegalDocNav current="/accessibility" />

      <div className="prose prose-sm max-w-none text-muted-foreground">
        <h2>1. Our commitment</h2>
        <p>
          ASAP Local wants our website and mobile application to be usable by as many people as possible, including
          people who rely on assistive technology such as screen readers, screen magnifiers, speech-recognition
          software, or keyboard-only navigation.
        </p>
        <p>
          We aim to meet the{" "}
          <span>Web Content Accessibility Guidelines (WCAG) 2.1 level AA</span> where practicable, and we treat
          accessibility as an ongoing process rather than a one-off task.
        </p>

        <h2>2. What we do</h2>
        <ul>
          <li>Use semantic HTML and landmark regions so assistive technology can navigate the page structure.</li>
          <li>Provide text alternatives for meaningful images.</li>
          <li>Support keyboard navigation for core flows such as search, job posting, messaging and booking.</li>
          <li>Aim for sufficient colour contrast between text and backgrounds, including in dark mode.</li>
          <li>Use responsive layouts that work with browser zoom and larger text sizes.</li>
          <li>Test key flows periodically as the product changes.</li>
        </ul>

        <h2>3. Known limitations</h2>
        <p>
          ASAP Local has not undergone a full independent accessibility audit. Some third-party components, embedded
          maps, and older parts of the platform may not yet fully meet WCAG 2.1 AA. We are working to identify and
          fix these issues over time.
        </p>

        <h2>4. Reporting an accessibility issue</h2>
        <p>
          If you encounter a barrier using ASAP Local, or need information in a different format, please contact us
          at <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a>. Please tell us the page or feature
          affected, the device and assistive technology you were using, and what happened — this helps us
          investigate and fix the issue.
        </p>
        <p>We aim to acknowledge accessibility reports promptly and address confirmed issues within a reasonable timeframe.</p>

        <h2>5. Changes</h2>
        <p>We may update this Accessibility Statement as our platform and our accessibility work evolve.</p>
      </div>
    </div>
  );
}
