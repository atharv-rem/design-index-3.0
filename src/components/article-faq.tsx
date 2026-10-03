import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ArticleFaqProps = {
  faqs: { question: string; answer: string }[];
};

// Panels stay mounted so every answer is in the server-rendered HTML,
// matching the FAQPage JSON-LD. The first one starts open.
export default function ArticleFaq({ faqs }: ArticleFaqProps) {
  return (
    <Accordion defaultValue={["faq-0"]} className="mt-4 w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.question} value={`faq-${index}`} className="border-app-border">
          <AccordionTrigger className="font-google text-[16px] font-semibold theme-text-primary">
            {faq.question}
          </AccordionTrigger>
          <AccordionPanel keepMounted className="font-(family-name:--font-inter-stack) text-[15px] font-medium leading-6 theme-text-muted">
            {faq.answer}
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
