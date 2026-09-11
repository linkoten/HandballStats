import { CONTACT_EMAIL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t-2 border-primary/10 py-6">
      <p className="text-center text-xs text-muted-foreground">
        Une question, une suggestion ? Écrivez-nous à{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline hover:text-primary"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
