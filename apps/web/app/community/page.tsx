import { LegalDocNav } from "@/components/legal-doc-nav";

export const metadata = { title: "Community, Reviews & Safety Policy — ASAP Local" };

export default function CommunitySafetyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">ASAP Local — Community, Reviews &amp; Safety Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: 11 September 2026</p>

      <LegalDocNav current="/community" />

      <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>This policy exists to make ASAP Local a trustworthy marketplace.</p>

        <h2>1. Our principles</h2>
        <p>ASAP Local expects everyone to:</p>
        <ul>
          <li>Be honest</li>
          <li>Be respectful</li>
          <li>Be professional</li>
          <li>Provide accurate information</li>
          <li>Respect privacy</li>
          <li>Keep users safe</li>
        </ul>

        <h2>2. Fake reviews are prohibited</h2>
        <p>You must not:</p>
        <ul>
          <li>Create fake reviews</li>
          <li>Purchase reviews</li>
          <li>Sell reviews</li>
          <li>Manufacture reviews</li>
          <li>Review your own business</li>
          <li>Ask friends or employees to post misleading reviews</li>
          <li>Use bots to generate reviews</li>
          <li>Manipulate ratings</li>
          <li>Offer undisclosed incentives for positive reviews</li>
        </ul>
        <p>
          ASAP Local may investigate suspicious review activity. UK consumer-protection rules now specifically
          prohibit certain fake-review practices, so this is an area where the platform should have robust controls
          (GOV.UK).
        </p>

        <h2>3. Genuine reviews only</h2>
        <p>Reviews should reflect genuine experiences. We may use:</p>
        <ul>
          <li>Booking history</li>
          <li>Account information</li>
          <li>Transaction information</li>
          <li>Technical information</li>
          <li>Manual review</li>
          <li>Automated fraud detection</li>
        </ul>
        <p>to identify potentially fraudulent activity.</p>

        <h2>4. Review moderation</h2>
        <p>We may remove, hide or restrict reviews that:</p>
        <ul>
          <li>Are fake</li>
          <li>Are fraudulent</li>
          <li>Contain threats</li>
          <li>Contain hate speech</li>
          <li>Contain personal information</li>
          <li>Are unlawful</li>
          <li>Are unrelated to the service</li>
          <li>Attempt to manipulate the platform</li>
          <li>Contain malicious links</li>
          <li>Impersonate another person</li>
        </ul>
        <p>We will not remove genuine negative reviews simply because they are negative.</p>

        <h2>5. Professional conduct</h2>
        <p>Professionals must treat Customers respectfully. Prohibited conduct includes:</p>
        <ul>
          <li>Harassment</li>
          <li>Threats</li>
          <li>Discrimination</li>
          <li>Intimidation</li>
          <li>Sexual harassment</li>
          <li>Unwanted contact</li>
          <li>Aggressive behaviour</li>
          <li>Property damage</li>
          <li>Theft</li>
          <li>Fraud</li>
          <li>Misrepresentation</li>
        </ul>

        <h2>6. Customer conduct</h2>
        <p>Customers must also behave appropriately. Customers must not:</p>
        <ul>
          <li>Threaten Professionals</li>
          <li>Harass Professionals</li>
          <li>Demand free work</li>
          <li>Deliberately misrepresent a job</li>
          <li>Create fake complaints</li>
          <li>Manipulate reviews</li>
          <li>Use the platform to facilitate unlawful activity</li>
        </ul>

        <h2>7. Personal information</h2>
        <p>Users must not request or share unnecessary personal information. Do not publish:</p>
        <ul>
          <li>Bank details</li>
          <li>Payment-card details</li>
          <li>Passwords</li>
          <li>Identity documents</li>
          <li>Private medical information</li>
          <li>Private contact information belonging to someone else</li>
        </ul>

        <h2>8. Property access</h2>
        <p>Professionals must only access areas necessary to perform the agreed service.</p>
        <p>Customers should provide reasonable and safe access.</p>
        <p>Neither party should give or request keys, access codes or other security credentials unnecessarily.</p>

        <h2>9. Safeguarding</h2>
        <p>Where services involve:</p>
        <ul>
          <li>Children</li>
          <li>Vulnerable adults</li>
          <li>Private homes</li>
          <li>Healthcare-related environments</li>
          <li>Personal care</li>
        </ul>
        <p>additional safeguards may apply. ASAP Local may require enhanced checks for certain services.</p>

        <h2>10. High-risk services</h2>
        <p>Certain categories may require additional verification. Examples include:</p>
        <ul>
          <li>Gas</li>
          <li>Electrical</li>
          <li>Structural work</li>
          <li>Certain construction work</li>
          <li>Child-related services</li>
          <li>Specialist security work</li>
        </ul>
        <p>
          Professionals must not offer regulated services unless they have the appropriate qualifications,
          registration and permissions.
        </p>

        <h2>11. Safety incidents</h2>
        <p>If you believe there is an immediate danger: contact emergency services first.</p>
        <p>
          For non-emergency safety concerns, contact:{" "}
          <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a>
        </p>
        <p>ASAP Local may immediately restrict an account where reasonably necessary to protect users.</p>

        <h2>12. Fraud</h2>
        <p>Report suspected:</p>
        <ul>
          <li>Fake identities</li>
          <li>Fake businesses</li>
          <li>Fake documents</li>
          <li>Payment fraud</li>
          <li>Review manipulation</li>
          <li>Duplicate accounts</li>
          <li>Scam behaviour</li>
        </ul>
        <p>
          to: <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a>
        </p>
        <p>We may investigate and cooperate with appropriate authorities where legally required.</p>

        <h2>13. Content</h2>
        <p>Users must not upload content that:</p>
        <ul>
          <li>Is illegal</li>
          <li>Is threatening</li>
          <li>Is discriminatory</li>
          <li>Infringes copyright</li>
          <li>Contains malware</li>
          <li>Contains unnecessary personal information</li>
          <li>Promotes criminal activity</li>
        </ul>

        <h2>14. Enforcement</h2>
        <p>Depending on severity, ASAP Local may:</p>
        <ul>
          <li>Warn the user.</li>
          <li>Remove content.</li>
          <li>Restrict features.</li>
          <li>Require additional verification.</li>
          <li>Suspend an account.</li>
          <li>Permanently terminate an account.</li>
          <li>Withhold access to certain marketplace features where legally permitted.</li>
          <li>Report matters to relevant authorities.</li>
        </ul>

        <h2>15. Appeals</h2>
        <p>
          Where appropriate, users can appeal moderation or enforcement decisions through:{" "}
          <a href="mailto:support@asaplocal.pro">support@asaplocal.pro</a>
        </p>
        <p>We may request additional information before reconsidering a decision.</p>

        <h2>16. No guarantee of safety</h2>
        <p>ASAP Local takes reasonable steps to improve marketplace safety, including verification and moderation.</p>
        <p>
          However, no online marketplace can guarantee that every user is honest, qualified, safe or suitable. Users
          should exercise reasonable judgement before entering into an agreement.
        </p>
      </div>
    </div>
  );
}
