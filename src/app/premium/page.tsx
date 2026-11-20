import Link from "next/link";

export const metadata = { title: "Premium & artist plans" };

const listener = {
  name: "Premium",
  price: "$9.99/month",
  note: "Proposed price — checkout activates when payment processing is connected.",
  perks: ["Ad-free listening (subject to clearly disclosed exceptions)", "Full-quality streaming", "Offline-ready library architecture", "Support the artists you play"],
};

const artistTiers = [
  { name: "Artist Starter", price: "$4.99/month", perks: ["Individual artist profile", "Music uploads with metadata & disclosures", "Basic analytics"] },
  { name: "Artist Pro", price: "$9.99/month", perks: ["Individual artist profile", "Release scheduling", "Advanced analytics & royalty reporting"] },
  { name: "Artist Label", price: "$19.99/month", perks: ["Multiple artist profiles", "Team management", "Label-wide analytics & royalty allocation reports"] },
];

export default function PremiumPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6">
      <p className="eyebrow">Membership</p>
      <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold sm:text-5xl">
        Go ad-free. Or put your own music on the stage.
      </h1>

      <div className="mt-10">
        <div className="card max-w-md border-[var(--color-accent)]/50 p-6" style={{ boxShadow: "var(--shadow-2)" }}>
          <p className="eyebrow">For listeners</p>
          <h2 className="mt-2 font-display text-2xl font-bold">{listener.name}</h2>
          <p className="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{listener.price}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {listener.perks.map((p) => (
              <li key={p} className="flex gap-2"><span className="text-[var(--color-accent)]" aria-hidden>✓</span>{p}</li>
            ))}
          </ul>
          <Link href="/register" className="btn btn-primary mt-6 w-full">Try Premium — $9.99/month</Link>
          <p className="mt-3 text-xs text-[var(--color-muted)]">{listener.note} Free tier remains available with ads.</p>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">For artists &amp; labels</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          Paid tiers unlock publishing and analytics tools. They never influence royalties, chart
          positions or awards eligibility — those are earned by listening activity and artistic merit only.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {artistTiers.map((t) => (
            <div key={t.name} className="card flex flex-col p-6">
              <h3 className="font-display text-lg font-bold">{t.name}</h3>
              <p className="mt-1 font-display text-2xl font-bold text-[var(--color-accent)]">{t.price}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2"><span className="text-[var(--color-accent)]" aria-hidden>✓</span>{p}</li>
                ))}
              </ul>
              <Link href="/register?accountType=artist" className="btn btn-ghost mt-6">Start with {t.name.split(" ")[1]}</Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Subscriptions activate when secure payment processing (Stripe) is connected; card details are
          never stored on CastAWAI systems.
        </p>
      </section>
    </div>
  );
}
