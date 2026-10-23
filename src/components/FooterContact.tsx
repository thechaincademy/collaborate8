import { Link } from "react-router-dom";

const FooterContact = ({ onDark = false }: { onDark?: boolean }) => (
  <address className={`mx-auto mt-6 max-w-5xl px-6 text-center text-xs not-italic leading-relaxed sm:text-left ${onDark ? "text-background/70" : "text-muted-foreground"}`}>
    <p>Collaborate Technologies Ltd, 86-90 Paul Street, London EC2A 4NE</p>
    <p>
      <a href="tel:+442034881055" className="hover:underline">
        020 3488 1055
      </a>
      {" | "}
      <a href="mailto:privacy@collaborate8.com" className="break-all hover:underline">
        privacy@collaborate8.com
      </a>
      {" | "}
      <Link to="/contact" className="hover:underline">
        Contact
      </Link>
    </p>
  </address>
);

export default FooterContact;