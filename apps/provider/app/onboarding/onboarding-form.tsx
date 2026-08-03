"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const BUSINESS_TYPES = [
  { value: "SOLE_TRADER", label: "Sole Trader" },
  { value: "LIMITED_COMPANY", label: "Limited Company" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CHARITY", label: "Charity" },
];

type Step = 1 | 2;

export function OnboardingForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [businessType, setBusinessType] = useState("SOLE_TRADER");
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [baseRadiusMiles, setBaseRadiusMiles] = useState(15);
  const [utrNumber, setUtrNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  const parentCategories = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }

  function toggleCategory(slug: string) {
    setCategorySlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function onNext(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (categorySlugs.length === 0) {
      setError("Choose at least one service you offer");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your business name");
      return;
    }
    if (description.trim().length < 20) {
      setError("Describe your business (20+ characters)");
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessType,
        categorySlugs,
        name,
        tradingName: tradingName || undefined,
        companyRegistrationNumber: companyRegistrationNumber || undefined,
        yearsInBusiness: yearsInBusiness ? Number(yearsInBusiness) : undefined,
        description,
        website: website || undefined,
        phone: phone || undefined,
        email: email || undefined,
        addressLine: addressLine || undefined,
        city,
        postcode: postcode || undefined,
        baseRadiusMiles,
        utrNumber: utrNumber || undefined,
        vatNumber: vatNumber || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  if (step === 1) {
    return (
      <Card className="mt-6 space-y-4 p-6">
        <form onSubmit={onNext} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business type</label>
            <Select className="mt-1" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Services you offer</label>
            <div className="mt-2 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-border p-3">
              {parentCategories.map((parent) => (
                <div key={parent.id}>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={categorySlugs.includes(parent.slug)} onChange={() => toggleCategory(parent.slug)} />
                    {parent.name}
                  </label>
                  <div className="ml-6 mt-1 space-y-1">
                    {(childrenByParent.get(parent.id) ?? []).map((child) => (
                      <label key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={categorySlugs.includes(child.slug)} onChange={() => toggleCategory(child.slug)} />
                        {child.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Trading name (optional)" value={tradingName} onChange={(e) => setTradingName(e.target.value)} />
          {businessType === "LIMITED_COMPANY" && (
            <Input placeholder="Company registration number" value={companyRegistrationNumber} onChange={(e) => setCompanyRegistrationNumber(e.target.value)} />
          )}
          <Input type="number" min={0} placeholder="Years in business (optional)" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} />
          <Textarea placeholder="Describe your business (20+ characters)" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          <Input placeholder="Website (optional)" value={website} onChange={(e) => setWebsite(e.target.value)} />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="mt-6 space-y-4 p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Contact information</p>
        <Input placeholder="Business phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input type="email" placeholder="Business email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Address line" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input required placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Service radius: {baseRadiusMiles} miles</label>
          <input type="range" min={1} max={50} value={baseRadiusMiles} onChange={(e) => setBaseRadiusMiles(Number(e.target.value))} className="w-full" />
        </div>

        <p className="pt-2 text-sm font-medium text-muted-foreground">Tax information (optional for launch)</p>
        <Input placeholder="UTR number" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} />
        <Input placeholder="VAT number" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Creating…" : "Create business profile"}</Button>
        </div>
      </form>
    </Card>
  );
}
