import { LegalDocNav } from "@/components/legal-doc-nav";

export const metadata = { title: "Contact & Complaints — ASAP Local" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ASAP Local — Contact &amp; Complaints</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: 11 September 2026</p>

      <LegalDocNav current="/contact" />

      <div className="prose prose-sm max-w-none text-muted-foreground">
        <h2>1. Company details</h2>
        <p>
          Asap Local Ltd
          <br />
          trading as ASAP Local
          <br />
          Company number: 17360048
          <br />
          Registered office: 30 The Green, Evelyn Grove, Bordon, United Kingdom, GU35 9GZ
        </p>

        <h2>2. General enquiries and support</h2>
        <p>
          For help with your account, a booking, or general questions, contact{" "}
          <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a> or use the{" "}
          <a href="/help">Help Center</a>.
        </p>

        <h2>3. Privacy requests</h2>
        <p>
          For questions about your personal information, or to exercise a right described in our{" "}
          <a href="/privacy">Privacy Policy</a>, contact <a href="mailto:privacy@asaplocal.pro">privacy@asaplocal.pro</a>.
        </p>

        <h2>4. Making a complaint</h2>
        <p>If you have a complaint about ASAP Local, a booking, a Customer or a Professional, you can contact us at:</p>
        <p>
          <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a>
        </p>
        <p>When you contact us, please include:</p>
        <ul>
          <li>Your account email or reference</li>
          <li>The booking or job affected, if applicable</li>
          <li>A description of what happened</li>
          <li>Any supporting information (screenshots, messages, photos)</li>
        </ul>
        <p>
          We aim to acknowledge complaints promptly and to investigate and respond within a reasonable timeframe. We
          will let you know if we need more information or more time to look into a complaint.
        </p>
        <p>
          Complaints about conduct, safety or fraud can also be raised under our{" "}
          <a href="/community">Community, Reviews &amp; Safety Policy</a>.
        </p>

        <h2>5. If you&rsquo;re not satisfied</h2>
        <p>
          If you remain unhappy after we have responded to your complaint, and it concerns how we have handled your
          personal information, you have the right to complain to the UK&rsquo;s Information Commissioner&rsquo;s
          Office (ico.org.uk).
        </p>
        <p>
          Depending on the nature of a dispute between a Customer and a Professional, independent alternative dispute
          resolution or consumer advice services may also be available.
        </p>
      </div>
    </div>
  );
}
