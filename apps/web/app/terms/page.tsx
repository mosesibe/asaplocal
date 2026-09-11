import { LegalDocNav } from "@/components/legal-doc-nav";

export const metadata = { title: "Terms & Conditions — ASAP Local" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ASAP Local — Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: 11 September 2026</p>

      <LegalDocNav current="/terms" />

      <div className="prose prose-sm max-w-none text-muted-foreground">
        <h2>1. About ASAP Local</h2>
        <p>ASAP Local is an online marketplace connecting Customers with independent Professionals.</p>
        <p>
          Unless expressly stated otherwise, ASAP Local does not itself provide the services advertised by
          Professionals. The service contract is normally between the Customer and the Professional.
        </p>
        <p>ASAP Local provides technology and marketplace services including:</p>
        <ul>
          <li>Job posting</li>
          <li>Search</li>
          <li>Matching</li>
          <li>Quotes</li>
          <li>Messaging</li>
          <li>Booking</li>
          <li>Payments</li>
          <li>Reviews</li>
          <li>Verification</li>
        </ul>

        <h2>2. Acceptance</h2>
        <p>By using ASAP Local, you agree to these Terms. If you do not agree, you must not use the platform.</p>
        <p>If you use ASAP Local on behalf of a business, you confirm that you have authority to do so.</p>

        <h2>3. Eligibility</h2>
        <p>You must provide accurate information when creating an account. You must not:</p>
        <ul>
          <li>Create an account using false information</li>
          <li>Impersonate another person</li>
          <li>Create multiple accounts to evade restrictions</li>
          <li>Use ASAP Local for unlawful activity</li>
        </ul>

        <h2>4. Customers</h2>
        <p>Customers may:</p>
        <ul>
          <li>Post jobs</li>
          <li>Receive quotes</li>
          <li>Communicate with Professionals</li>
          <li>Book Professionals</li>
          <li>Pay for services</li>
          <li>Review Professionals</li>
        </ul>
        <p>Customers must provide accurate information about the work required.</p>

        <h2>5. Professionals</h2>
        <p>
          Professionals must comply with the separate ASAP Local{" "}
          <a href="/terms/professionals">Professional Terms</a>. Those Terms form part of the agreement between ASAP
          Local and the Professional.
        </p>

        <h2>6. Jobs and quotes</h2>
        <p>Customers may post jobs describing their requirements. Professionals may submit quotes.</p>
        <p>A quote should clearly identify:</p>
        <ul>
          <li>Price</li>
          <li>VAT where applicable</li>
          <li>Materials</li>
          <li>Labour</li>
          <li>Call-out charges</li>
          <li>Additional charges</li>
          <li>Estimated timeframe</li>
          <li>Important assumptions</li>
        </ul>
        <p>A Customer should not accept a quote until they understand what is included.</p>

        <h2>7. Service contract</h2>
        <p>
          When a Customer accepts a Professional&rsquo;s quote or otherwise agrees to engage the Professional, a
          contract may arise directly between them.
        </p>
        <p>That contract should cover:</p>
        <ul>
          <li>Work required</li>
          <li>Price</li>
          <li>Timing</li>
          <li>Materials</li>
          <li>Access</li>
          <li>Cancellation arrangements</li>
          <li>Any guarantees</li>
          <li>Any exclusions</li>
        </ul>
        <p>ASAP Local is not normally a party to that contract.</p>

        <h2>8. ASAP Local&rsquo;s role</h2>
        <p>ASAP Local does not guarantee that:</p>
        <ul>
          <li>A Professional will accept a job</li>
          <li>A quote will be accurate</li>
          <li>A Professional will attend</li>
          <li>Work will be completed</li>
          <li>Work will meet expectations</li>
          <li>A particular result will be achieved</li>
        </ul>
        <p>However, nothing in these Terms excludes rights or liabilities that cannot legally be excluded.</p>

        <h2>9. Verification</h2>
        <p>ASAP Local may verify Professionals. Verification may include:</p>
        <ul>
          <li>Identity</li>
          <li>Business</li>
          <li>Address</li>
          <li>Insurance</li>
          <li>Qualifications</li>
          <li>Professional registrations</li>
          <li>Other risk checks</li>
        </ul>
        <p>
          A verification badge indicates that the relevant check has been completed according to ASAP Local&rsquo;s
          process. It is not a guarantee of workmanship, honesty, reliability or safety.
        </p>

        <h2>10. Payments</h2>
        <p>
          Where payments are made through ASAP Local, they may be processed by a third-party payment provider. Fees,
          refunds and payment arrangements will be displayed before the relevant transaction where applicable.
        </p>

        <h2>11. Fees</h2>
        <p>ASAP Local may charge Customers and/or Professionals:</p>
        <ul>
          <li>Booking fees</li>
          <li>Transaction fees</li>
          <li>Subscription fees</li>
          <li>Lead fees</li>
          <li>Commission</li>
          <li>Payment-related fees</li>
        </ul>
        <p>Applicable fees will be communicated before they become payable.</p>

        <h2>12. Cancellations</h2>
        <p>Cancellation rights vary depending on the type of contract and circumstances.</p>
        <p>Where statutory consumer cancellation rights apply, they will not be excluded.</p>
        <p>
          Online service providers must provide specified pre-contract information and, where applicable,
          information about cancellation rights (GOV.UK).
        </p>

        <h2>13. Reviews</h2>
        <p>Reviews must be genuine, honest and based on real interactions. Users must not:</p>
        <ul>
          <li>Write fake reviews</li>
          <li>Buy reviews</li>
          <li>Sell reviews</li>
          <li>Manipulate ratings</li>
          <li>Review themselves</li>
          <li>Ask friends to create fake reviews</li>
          <li>Offer undisclosed incentives for positive reviews</li>
          <li>Threaten someone to obtain a review</li>
        </ul>
        <p>
          ASAP Local may moderate or remove content that breaches the{" "}
          <a href="/community">Community, Reviews &amp; Safety Policy</a>. The UK&rsquo;s current consumer-protection
          regime specifically addresses fake reviews and review manipulation (GOV.UK).
        </p>

        <h2>14. Prohibited activity</h2>
        <p>You must not use ASAP Local to:</p>
        <ul>
          <li>Commit fraud</li>
          <li>Harass users</li>
          <li>Threaten users</li>
          <li>Upload malware</li>
          <li>Circumvent security</li>
          <li>Manipulate reviews</li>
          <li>Misrepresent qualifications</li>
          <li>Provide unlawful services</li>
          <li>Abuse payment systems</li>
          <li>Circumvent applicable platform fees</li>
          <li>Scrape the platform without permission</li>
        </ul>

        <h2>15. Suspension</h2>
        <p>We may suspend or restrict an account where reasonably necessary to:</p>
        <ul>
          <li>Protect users</li>
          <li>Investigate suspected fraud</li>
          <li>Enforce these Terms</li>
          <li>Protect the platform</li>
          <li>Address safety concerns</li>
          <li>Address failed verification</li>
          <li>Comply with law</li>
        </ul>
        <p>Where appropriate, we will provide an explanation and review process.</p>

        <h2>16. Intellectual property</h2>
        <p>
          ASAP Local owns or licenses the platform, branding, software, design and other intellectual property. You
          may not copy, reproduce or commercially exploit these materials without permission.
        </p>

        <h2>17. User content</h2>
        <p>You retain ownership of content you upload.</p>
        <p>
          You grant ASAP Local a non-exclusive licence to host, display, reproduce and use that content as reasonably
          necessary to operate, market and improve the platform.
        </p>
        <p>You must have the right to upload the content.</p>

        <h2>18. Liability</h2>
        <p>Nothing in these Terms excludes or limits liability that cannot legally be excluded. Subject to that:</p>
        <ul>
          <li>
            ASAP Local is not responsible for losses caused solely by the acts or omissions of an independent
            Customer or Professional where ASAP Local itself has not caused the relevant loss.
          </li>
          <li>Consumer rights remain unaffected.</li>
        </ul>
        <p>
          Terms that attempt to remove non-excludable consumer protections may be unfair or unenforceable, so our
          terms are intended to operate subject to mandatory consumer protections (GOV.UK).
        </p>

        <h2>19. Governing law</h2>
        <p>These Terms are governed by the laws of England and Wales. Consumers retain any mandatory rights concerning applicable jurisdiction.</p>
      </div>
    </div>
  );
}
