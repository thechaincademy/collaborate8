import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="font-serif text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="font-serif text-xl font-bold text-foreground">medi8</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-foreground">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-foreground">Contact</a>
            <a href="#" className="transition-colors hover:text-foreground">FAQ</a>
          </div>

          {/* Copyright */}
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 fill-accent text-accent" /> in London
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Medi8. All rights reserved. Medi8 is not affiliated with the Child Maintenance Service (CMS).
        </div>
      </div>
    </footer>
  );
};

export default Footer;
