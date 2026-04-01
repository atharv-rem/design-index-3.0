"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    id: "submit-tool",
    question: "How can I submit a tool to Design Index?",
    answer:
      "Open the Submit Tool page from the sidebar and share your tool name, link, and category. After review, it can be added to the index.",
  },
  {
    id: "free-use",
    question: "Is Design Index free to use?",
    answer:
      "Yes. Browsing and discovering resources on Design Index is completely free.",
  },
  {
    id: "update-frequency",
    question: "How often are resources updated?",
    answer:
      "The collection is updated regularly as new resources are discovered and existing links are refreshed.",
  },
  {
    id: "categories",
    question: "What kind of resources can I find here?",
    answer:
      "You can explore tools, mockups, icon packs, fonts, color resources, and design inspiration references.",
  },
];

export default function HomeFaq() {
  return (
    <section aria-labelledby="faq-heading" className="w-full bg-black/45 p-5 backdrop-blur-sm md:p-7">
      <p className="font-departure text-[11px] uppercase tracking-[0.16em] text-[#a7a7a7]">FAQ</p>
      <h2 id="faq-heading" className="mt-2 font-kal text-3xl font-semibold text-white md:text-4xl">
        Frequently asked questions
      </h2>

      <Accordion defaultValue={[faqItems[0].id]} className="mt-5">
        {faqItems.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="">
            <AccordionTrigger className="text-white hover:text-white/90 font-departure">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-[#d3d3d3] font-departure">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
