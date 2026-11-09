import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";
import FooterContact from "@/components/FooterContact";

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-lg font-semibold text-foreground">{children}</h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">{children}</h3>
);

const List = ({ children }: { children: ReactNode }) => (
  <ul className="mt-2 list-disc space-y-1.5 pl-5">{children}</ul>
);

const Email = () => (
  <a href="mailto:privacy@collaborate8.com" className="break-all font-medium text-foreground underline">
    privacy@collaborate8.com
  </a>
);

const Accessibility = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Accessibility statement | Collabor8</title>
        <meta name="description" content="How accessible the Collabor8 website is, known issues, and how to contact us." />
        <link rel="canonical" href="https://collaborate8.com/accessibility" />
        <meta property="og:url" content="https://collaborate8.com/accessibility" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
        <TopBanner />
        <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-12 focus:outline-none">
          <button onClick={() => navigate(-1)} className="mb-8 flex min-h-6 items-center gap-2 py-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>

          <h1 className="mb-8 text-3xl font-bold text-foreground">Accessibility statement for Collabor8</h1>

          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <p>This accessibility statement applies to the Collabor8 website at collaborate8.com, including the pages that open inside the Collabor8 app. It is run by Collaborate Technologies Ltd.</p>
              <p>We want as many people as possible to be able to use Collabor8. For example, you should be able to:</p>
              <List>
                <li>zoom in up to 400% without the text spilling off the screen</li>
                <li>use the website on a screen as narrow as 320 pixels without scrolling sideways</li>
                <li>navigate most of the website using just a keyboard</li>
                <li>navigate most of the website using speech recognition software</li>
                <li>listen to most of the website using a screen reader (including the most recent versions of JAWS, NVDA and VoiceOver)</li>
                <li>change colours, contrast levels and fonts using your browser or device settings</li>
              </List>
              <p>We've also tried to keep the language on the website as simple as possible.</p>
            </section>

            <section>
              <H2>How accessible this website is</H2>
              <p>In November 2026 we tested this website and made changes to fix the problems we found. We are re-testing every page now. Until that re-test is complete, we list the problems we found below, with the date by which each one will be fixed. We know some parts of this website may not be fully accessible:</p>
              <List>
                <li>some text has low colour contrast, including in the resource guides, the child maintenance calculator and some page footers</li>
                <li>some buttons and form fields are not announced properly by screen readers, for example the back arrow on the password reset page and some fields in the calculator</li>
                <li>some form fields show their name only as placeholder text, which disappears when you start typing</li>
                <li>there is no "skip to main content" link, so keyboard users have to move through the menu on every page</li>
                <li>some tables in our Privacy Policy cannot be scrolled sideways using a keyboard on small screens</li>
                <li>the edges of form fields and the keyboard focus highlight are hard to see in places</li>
              </List>
            </section>

            <section className="space-y-3">
              <H2>Feedback and contact information</H2>
              <p>If you need information on this website in a different format, like accessible PDF, large print, easy read or audio, or you need help using Collabor8:</p>
              <List>
                <li>email <Email /></li>
                <li>write to Collaborate Technologies Ltd, 86-90 Paul Street, London EC2A 4NE</li>
              </List>
              <p>We'll consider your request and get back to you within 5 working days.</p>
            </section>

            <section>
              <H2>Reporting accessibility problems with this website</H2>
              <p>We're always looking to improve the accessibility of this website. If you find any problems not listed on this page, or think we're not meeting accessibility requirements, email <Email />. Please tell us the page address (URL), what you were trying to do, and the device and any assistive technology you were using.</p>
            </section>

            <section>
              <H2>If you're not happy with our response</H2>
              <p>Collabor8 is a service provided by a private company. Under the Equality Act 2010, service providers must make reasonable adjustments so that disabled people can use their services. If you're not happy with how we respond to your complaint, you can contact the Equality Advisory and Support Service (EASS) at <a href="https://www.equalityadvisoryservice.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline">equalityadvisoryservice.com</a>.</p>
            </section>

            <section>
              <H2>Technical information about this website's accessibility</H2>
              <p>Collaborate Technologies Ltd is committed to making its website accessible, in line with the Equality Act 2010. We use the Web Content Accessibility Guidelines (WCAG) version 2.2, level AA, as our standard.</p>
              <H3>Compliance status</H3>
              <p>This website is partially compliant with the Web Content Accessibility Guidelines version 2.2 AA standard, because of the non-compliances listed below.</p>
            </section>

            <section>
              <H2>Non-accessible content</H2>
              <p>The content listed below is non-accessible for the following reasons.</p>

              <H3>Non-compliance with the accessibility regulations</H3>

              <p className="mt-3 font-semibold text-foreground">Colour contrast</p>
              <List>
                <li>In the resource guides (collaborate8.com/resources and the guide pages), the "Get started free" button, the breadcrumb links, the "Ready to make things simpler?" section and the footer disclaimer have low contrast. The same applies to the white text at the top of the child maintenance guide. This fails WCAG 2.2 success criterion 1.4.3 (Contrast (Minimum)). We plan to fix this by 20 November 2026.</li>
                <li>The helper text under the questions in the child maintenance calculator, and the section headings in the downloadable result, have low contrast. This fails WCAG 2.2 success criterion 1.4.3. We plan to fix this by 20 November 2026.</li>
                <li>Some mustard-coloured text on light backgrounds is hard to read. This includes links on the co-parenting tips page, headings on the Contact and Blog pages, episode numbers and "New" labels on the Blog page, and the figures on the About page. This fails WCAG 2.2 success criterion 1.4.3. We plan to fix this by 4 December 2026.</li>
                <li>The copyright and address lines at the bottom of the Privacy Policy and Terms of Service, and the "Add to home screen" link on the home page, have low contrast. This fails WCAG 2.2 success criterion 1.4.3. We plan to fix this by 4 December 2026.</li>
                <li>Inside your account, some status labels (for example "Deadline soon" and "Confirmed"), some mustard-coloured text and some faded text in Documents have low contrast. This fails WCAG 2.2 success criterion 1.4.3. We plan to fix this by 4 December 2026.</li>
                <li>The borders of form fields and the keyboard focus highlight have low contrast against the page. This fails WCAG 2.2 success criterion 1.4.11 (Non-text Contrast). We plan to fix this by 4 December 2026.</li>
              </List>

              <p className="mt-4 font-semibold text-foreground">Buttons, form fields and labels</p>
              <List>
                <li>The back arrow button on the password reset and invited sign-up pages, and on some pages inside your account, has no text alternative. Screen reader users hear "button" with no description. This fails WCAG 2.2 success criterion 4.1.2 (Name, Role, Value). We plan to fix this by 20 November 2026.</li>
                <li>The drop-down questions in the child maintenance calculator are not linked to their question text, so screen readers do not announce what each one is for. This fails WCAG 2.2 success criteria 1.3.1 (Info and Relationships) and 4.1.2. We plan to fix this by 20 November 2026.</li>
                <li>Inside your account, some field labels are not linked to their fields. This includes adding an expense and starting a new decision. Some fields have no label at all, such as the co-parent email, payment amount and message fields. This fails WCAG 2.2 success criteria 1.3.1, 3.3.2 (Labels or Instructions) and 4.1.2. We plan to fix this by 20 November 2026.</li>
                <li>Some fields show their name only as placeholder text, which disappears when you type. These are on the password reset, invited sign-up and set-up pages. This fails WCAG 2.2 success criterion 3.3.2. We plan to fix this by 4 December 2026.</li>
                <li>Error messages on sign-up and login forms are not linked to the field they relate to, and are not always announced by screen readers. This fails WCAG 2.2 success criterion 3.3.1 (Error Identification). We plan to fix this by 18 December 2026.</li>
                <li>Email and name fields do not tell browsers what information they expect, so autofill may not work. This fails WCAG 2.2 success criterion 1.3.5 (Identify Input Purpose). We plan to fix this by 18 December 2026.</li>
              </List>

              <p className="mt-4 font-semibold text-foreground">Keyboard and navigation</p>
              <List>
                <li>There is no "skip to main content" link. This fails WCAG 2.2 success criterion 2.4.1 (Bypass Blocks). We plan to fix this by 4 December 2026.</li>
                <li>On small screens, the tables in our Privacy Policy cannot be scrolled sideways with a keyboard. This fails WCAG 2.2 success criterion 2.1.1 (Keyboard). We plan to fix this by 4 December 2026.</li>
                <li>On larger screens, the small dots on the right of the child maintenance guide can receive keyboard focus but are hidden from screen readers. They are also smaller than 24 by 24 pixels. This fails WCAG 2.2 success criteria 4.1.2 and 2.5.8 (Target Size (Minimum)). We plan to fix this by 4 December 2026.</li>
                <li>Some pages do not mark up their main content area, and some pages have two navigation menus with the same name. This fails WCAG 2.2 success criterion 1.3.1. We plan to fix this by 18 December 2026.</li>
                <li>Some text links in the page footer may be smaller than 24 pixels high. This may fail WCAG 2.2 success criterion 2.5.8. We plan to check and fix this by 18 December 2026.</li>
              </List>

              <H3>Disproportionate burden</H3>
              <p>We are not claiming disproportionate burden for any content.</p>

              <H3>Content that's not within the scope of the accessibility regulations</H3>
              <p>We are not aware of any content on this website that falls outside the scope of the accessibility regulations. If we add embedded videos from third parties (for example YouTube) in future, we will provide a text summary on request.</p>
            </section>

            <section>
              <H2>What we're doing to improve accessibility</H2>
              <p>We have made changes to fix the issues above, starting with contrast and form labels, and are re-testing them. We re-test each page with automated tools and keyboard checks after every change, and we will review this statement each time we fix a group of issues.</p>
            </section>

            <section className="space-y-3">
              <H2>Preparation of this accessibility statement</H2>
              <p>This statement was prepared on 9 November 2026. It was last reviewed on 9 November 2026.</p>
              <p>This website was last tested on 9 November 2026. The test was carried out by the Collabor8 team. We tested 22 public pages, including the home page, sign-up, log in, password reset, Premium, resources and guides, the child maintenance calculator, Blog, FAQ, About, Contact, Privacy Policy, Terms of Service, Cookie Policy and account deletion. Each page was tested at mobile (320 pixels) and desktop (1280 pixels) widths, using automated testing (axe-core) and manual keyboard and contrast checks. We also reviewed the code for the signed-in parts of the website.</p>
            </section>
          </div>
        </main>

        <footer className="bg-foreground px-[5vw] py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[1.1rem] text-white/70" style={{ fontFamily: "'Fraunces', serif" }}>Collabor8</span>
              <p className="mt-1 text-[0.8rem] text-white/60">&copy; {new Date().getFullYear()} Collaborate Technologies Ltd. All rights reserved.</p>
            </div>
            <div className="text-right text-[0.8rem] text-white/60">
              <Link to="/terms" className="inline-flex min-h-6 items-center text-white/50 hover:text-white/80">Terms of Service</Link>
              {" · "}
              <Link to="/privacy" className="inline-flex min-h-6 items-center text-white/50 hover:text-white/80">Privacy Policy</Link>
              {" · "}
              <Link to="/cookies" className="inline-flex min-h-6 items-center text-white/50 hover:text-white/80">Cookie Policy</Link>
              {" · "}
              <Link to="/accessibility" aria-current="page" className="inline-flex min-h-6 items-center text-white/50 hover:text-white/80">Accessibility</Link>
            </div>
          </div>
          <FooterContact onDark />
        </footer>
      </div>
    </>
  );
};

export default Accessibility;
