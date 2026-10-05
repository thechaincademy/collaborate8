const FooterContact = ({ onDark = false }: { onDark?: boolean }) => (
  <address className={`mx-auto mt-6 max-w-5xl px-6 text-center text-xs not-italic leading-relaxed sm:text-left ${onDark ? "text-background/70" : "text-muted-foreground"}`}>
    <p>Collaborate Technologies Ltd, 86-90 Paul Street, London EC2A 4NE</p>
    <a href="mailto:privacy@collaborate8.com" className="break-all hover:underline">
      privacy@collaborate8.com
    </a>
  </address>
);

export default FooterContact;