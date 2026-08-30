import { Header } from "./header";
import { Footer } from "./footer";
import { Eyebrow } from "@/components/ui/card";

export function ProsePage({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="display text-4xl sm:text-5xl text-brand-dark mt-2 field-underline">
          {title}
        </h1>
        {updatedAt && (
          <p className="mt-4 text-sm text-brand-muted">Τελευταία ενημέρωση: {updatedAt}</p>
        )}
        <article className="prose-agrotik mt-8">{children}</article>
      </main>
      <Footer />
    </>
  );
}
