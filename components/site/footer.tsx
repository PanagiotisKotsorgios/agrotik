import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "./logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 bg-brand-ink text-brand-bg">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="bg-brand-surface inline-block rounded-md p-2">
              <Logo size={40} />
            </div>
            <p className="mt-4 text-brand-bg/75 text-[15px] leading-relaxed max-w-sm">
              Άμεση σύνδεση αγροτών, εμπόρων και εργοστασίων. Πραγματικές τιμές
              στη γη · καμία μεσιτεία · καμία προμήθεια.
            </p>
            <div className="mt-5 space-y-1.5 text-[14px]">
              <a
                href="tel:2631028971"
                className="inline-flex items-center gap-2 text-brand-bg/90 hover:text-brand-light"
              >
                <Icon name="phone" className="text-brand-bg/50 w-4" /> <span className="figures">2631028971</span>
              </a>
              <br />
              <a
                href="mailto:info@agrotik.gr"
                className="inline-flex items-center gap-2 text-brand-bg/90 hover:text-brand-light break-all"
              >
                <Icon name="envelope" className="text-brand-bg/50 w-4" /> info@agrotik.gr
              </a>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="mailto:info@agrotik.gr"
                aria-label="Email"
                className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 inline-flex items-center justify-center"
              >
                <Icon name="envelope" />
              </a>
              <a
                href="tel:2631028971"
                aria-label="Τηλέφωνο"
                className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 inline-flex items-center justify-center"
              >
                <Icon name="phone" />
              </a>
              <a
                href="https://github.com/PanagiotisKotsorgios/agrotik"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 rounded-md bg-white/5 hover:bg-white/10 inline-flex items-center justify-center"
              >
                <Icon name="globe" />
              </a>
            </div>
          </div>

          <FooterColumn title="Εξερεύνηση">
            <FooterLink href="/search/buyers" icon="store">Αγοραστές</FooterLink>
            <FooterLink href="/search/producers" icon="seedling">Παραγωγοί</FooterLink>
            <FooterLink href="/signup" icon="user">Εγγραφή</FooterLink>
            <FooterLink href="/login" icon="unlock">Σύνδεση</FooterLink>
          </FooterColumn>

          <FooterColumn title="Πλατφόρμα">
            <FooterLink href="/how-it-works" icon="listCheck">Πώς λειτουργεί</FooterLink>
            <FooterLink href="/faq" icon="info">Συχνές ερωτήσεις</FooterLink>
            <FooterLink href="/pricing" icon="tag">Κόστος</FooterLink>
            <FooterLink href="/contact" icon="envelope">Επικοινωνία</FooterLink>
          </FooterColumn>

          <FooterColumn title="Νομικά">
            <FooterLink href="/legal/terms" icon="shield">Όροι χρήσης</FooterLink>
            <FooterLink href="/legal/privacy" icon="lock">Απόρρητο</FooterLink>
            <FooterLink href="/legal/cookies" icon="check">Cookies</FooterLink>
            <FooterLink href="/legal/imprint" icon="tag">Στοιχεία εταιρείας</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-brand-bg/60">
          <span>© {year} AGROTIK. Όλα τα δικαιώματα διατηρούνται.</span>
          <span className="eyebrow text-brand-bg/40">v0.1</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-brand-bg/60 mb-3">{title}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-brand-bg/85 hover:text-brand-light text-[14px]"
      >
        <Icon name={icon} className="text-brand-bg/40 w-4 text-center text-[0.85em]" /> {children}
      </Link>
    </li>
  );
}
