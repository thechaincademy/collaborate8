import ResourceArticle, { A, BList, H2, L, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "What should we sort out first after separating?", a: "Start with your children: agree child maintenance, decide how extra costs will be shared, and start keeping a record. Then check your benefits, Council Tax and Child Benefit, and get advice on property or pensions." },
  { q: "Does child maintenance affect Universal Credit?", a: "No. gov.uk says child maintenance won't affect any benefits you and your children get, including Universal Credit. Citizens Advice says Council Tax Reduction may be affected, so check with your council." },
  { q: "Do I pay tax on child maintenance?", a: "No. gov.uk says you won't have to pay tax on child maintenance payments." },
  { q: "We weren't married. Do we have the same rights?", a: "Not over money and property. In England and Wales, partners who weren't married or in a civil partnership don't have the same rights, even if they have children. Both parents still have to share financial support for their children." },
  { q: "Can I get money off Council Tax after separating?", a: "If you now live on your own, or everyone else in your home is disregarded (children under 18 count as disregarded), gov.uk says you can get 25% off. Apply to your local council." },
  { q: "Where can I get free help with money after separation?", a: "Citizens Advice, MoneyHelper, gov.uk's Get help arranging child maintenance tool and a local family mediator are all good places to start." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, Separating or divorcing: what you need to do", url: "https://www.gov.uk/separation-divorce" },
  { label: "gov.uk, Child Maintenance Service: what child maintenance is (benefits, tax, privacy)", url: "https://www.gov.uk/child-maintenance-service" },
  { label: "gov.uk, Get help arranging child maintenance", url: "https://child-maintenance.service.gov.uk/apply/get-help-arranging-child-maintenance/" },
  { label: "gov.uk, Benefits calculators", url: "https://www.gov.uk/benefits-calculators" },
  { label: "gov.uk, Universal Credit: report a change of circumstances", url: "https://www.gov.uk/universal-credit/changes-of-circumstances" },
  { label: "gov.uk, Council Tax: who has to pay", url: "https://www.gov.uk/council-tax/who-has-to-pay" },
  { label: "gov.uk, Child Benefit", url: "https://www.gov.uk/child-benefit" },
  { label: "gov.uk, Making child arrangements: apply for a court order (mediation voucher)", url: "https://www.gov.uk/looking-after-children-divorce/apply-for-court-order" },
  { label: "gov.uk, Making child arrangements: get help and support", url: "https://www.gov.uk/looking-after-children-divorce/get-help-and-support" },
  { label: "gov.uk, Domestic abuse: how to get help", url: "https://www.gov.uk/guidance/domestic-abuse-how-to-get-help" },
  { label: "Citizens Advice, Check what child maintenance arrangement is right for you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/choosing-how-to-arrange-child-maintenance/check-what-child-maintenance-arrangement-is-right-for-you/" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "MoneyHelper, Divorce and separation", url: "https://www.moneyhelper.org.uk/en/family-and-care/divorce-and-separation" },
  { label: "Family Mediation Council, Find a local mediator", url: "https://www.familymediationcouncil.org.uk/find-local-mediator/" },
];

const FinancesAfterSeparation = () => (
  <ResourceArticle
    route="/resources/finances-after-separation"
    seoTitle="Finances After Separation: Where to Start | Collabor8"
    description="Separated with children? A calm checklist for sorting money: child maintenance, shared costs, records, benefits checks and where to get free help."
    h1="Finances after separation: where to start"
    crumbLabel="Finances after separation"
    lead="Start with the money your children need: agree child maintenance, decide how you'll share extra costs, and keep a clear record from day one. Then check whether your benefits, Council Tax or Child Benefit should change, and get free advice on bigger questions like the home or pensions."
    faq={faq}
    cta={{
      heading: "Take the first step today",
      text: "Use our free child maintenance calculator to get a starting figure you can both look at, then read our guide on setting up payments. Collabor8 keeps the shared record of maintenance and shared costs from day one, so you both have the same facts.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: How to set up payments", to: "/resources/child-maintenance-guide#article-3" },
    }}
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>1. Start with what your children need</H2>
    <P>When you separate and have children, gov.uk says you and your ex-partner must share financial support for them. This is child maintenance. You can arrange it:</P>
    <BList items={[
      <>between yourselves, as a <L to="/resources/child-maintenance-agreement">family-based arrangement</L>, if you both agree</>,
      "through the Child Maintenance Service, the government service that can work out an amount, arrange payments and take action if a parent doesn't pay",
    ]} />
    <P>The government's <A href="https://child-maintenance.service.gov.uk/apply/get-help-arranging-child-maintenance/">Get help arranging child maintenance</A> tool explains both options. To get a sense of the figure, try our free <L to="/child-maintenance-calculator">child maintenance calculator</L>.</P>
    <P>If you don't want the other parent to know where you live, the Child Maintenance Service can arrange child maintenance without sharing your location or personal information. gov.uk also explains <A href="https://www.gov.uk/guidance/domestic-abuse-how-to-get-help">how to get help if you're experiencing domestic abuse</A>.</P>
    <P>Arrangements for seeing your children are made separately from money.</P>

    <H2>2. Agree how you'll share extra costs</H2>
    <P>Regular maintenance is only part of the picture. School uniform, trips, clubs, childcare and birthdays come up all year round. Decide early whether these are covered by regular maintenance or split separately, and how. Our page on <L to="/resources/what-does-child-maintenance-cover">what child maintenance covers</L> has some simple options.</P>

    <H2>3. Keep a record from day one</H2>
    <P>Citizens Advice recommends keeping a record of all the payments you make or receive, and suggests paying by standing order so payments are more likely to be on time and there's a record of them. Keep receipts for shared costs too. A clear record protects both parents if memories differ later.</P>

    <H2>4. Check your benefits and bills</H2>
    <P>Your household income may change, so it's worth checking what you're entitled to now.</P>
    <BList items={[
      <><strong>Benefits calculators.</strong> gov.uk links to <A href="https://www.gov.uk/benefits-calculators">free, anonymous benefits calculators</A> that estimate what you could get and how changes in your circumstances affect it.</>,
      <><strong>Universal Credit.</strong> If you claim it, report changes as soon as they happen, such as moving to a new address. gov.uk warns that delays can mean you're paid too much and have to pay it back.</>,
      <><strong>Child maintenance and benefits.</strong> gov.uk says child maintenance won't affect any benefits you and your children get, including Universal Credit, and you won't pay tax on it. Citizens Advice notes one exception to check: if you get Council Tax Reduction, you might get less help, so ask your council.</>,
      <><strong>Council Tax.</strong> gov.uk says you can get 25% off your bill if you pay Council Tax and either live on your own or everyone else in your home is disregarded, which includes children under 18. You need to apply to your council.</>,
      <><strong>Child Benefit.</strong> Only one person can get Child Benefit for a child. Agree who claims, and report any change to the Child Benefit Office.</>,
    ]} />

    <H2>5. Know where you stand on the bigger things</H2>
    <P>Your rights over money and property depend on whether you were married or in a civil partnership. gov.uk explains that if you weren't, you don't have the same rights as married or civil partners, even if you lived together for a long time or have children, because "common law marriage" doesn't exist in England and Wales. If you're married or in a civil partnership, an agreement about money and property needs to be approved by a court to be legally binding. The rules are different in Scotland and Northern Ireland.</P>
    <P>These questions are worth getting proper advice on.</P>

    <H2>6. Get free help</H2>
    <P>You don't have to work this out alone.</P>
    <BList items={[
      <><strong><A href="https://www.citizensadvice.org.uk/">Citizens Advice</A></strong> has free advice on child maintenance, benefits, separation and more.</>,
      <><strong><A href="https://www.moneyhelper.org.uk/en/family-and-care/divorce-and-separation">MoneyHelper</A></strong> has free guides on sorting out money when you separate, whether or not you were married.</>,
      <><strong><A href="https://child-maintenance.service.gov.uk/apply/get-help-arranging-child-maintenance/">Get help arranging child maintenance</A></strong> on gov.uk walks you through your options.</>,
      <><strong>A family mediator</strong> can help you agree arrangements. Search on the <A href="https://www.familymediationcouncil.org.uk/find-local-mediator/">Family Mediation Council</A> website. gov.uk says you can usually get a voucher worth up to £500 towards the cost of mediation when you need to agree arrangements for your children.</>,
      <><strong>Relate</strong> offers counselling, and <strong>Samaritans</strong> are there if you or someone you know is struggling to cope. gov.uk lists both.</>,
    ]} />
    <P>When you're ready to talk money with your ex, our page on <L to="/resources/talking-to-your-ex-about-money">talking to your ex about money</L> can help.</P>
  </ResourceArticle>
);

export default FinancesAfterSeparation;
