"use client";

type FeatureItem = {
  title: string;
  description: string;
};

const featureItems: FeatureItem[] = [
  {
    title: "Curated quality",
    description:
      "Only useful, design-focused resources so users spend less time searching and more time creating.",
  },
  {
    title: "Category discovery",
    description:
      "Quickly browse fonts, icons, mockups, colors, tools, and inspiration from a single index.",
  },
  {
    title: "Fast navigation",
    description:
      "Find what you need quickly with clean structure and direct links to each resource.",
  },
  {
    title: "Fresh additions",
    description:
      "New resources and updates are added regularly to keep the collection practical and current.",
  },
];

export default function HomeFeatures() {
  return (
    <section aria-labelledby="features-heading" className="w-full theme-panel p-5 md:p-7 rounded-[10px] md:rounded-2xl">
      <p className="font-departure text-[11px] uppercase tracking-[0.16em] theme-text-soft">
        Features
      </p>
      <h2 id="features-heading" className="mt-2 font-kal text-3xl font-semibold theme-text-primary md:text-4xl">
        What users get here
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {featureItems.map((feature) => (
          <article key={feature.title} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <h3 className="font-kal text-xl font-semibold theme-text-primary">{feature.title}</h3>
            <p className="mt-2 font-departure text-sm leading-6 theme-text-muted">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
