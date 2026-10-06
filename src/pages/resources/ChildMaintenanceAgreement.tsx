import ResourceArticle, { A, BList, H2, L, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "Is a signed child maintenance agreement legally binding?", a: "No. A written family-based arrangement isn't legally binding, even if you both sign it. If you're getting divorced or ending a civil partnership, a court-approved consent order can make it binding. Get legal advice if you want one." },
  { q: "Do we need a solicitor to make a child maintenance agreement?", a: "No. You can agree a family-based arrangement yourselves, and no one else has to be involved. Legal advice is usually only needed if you want a court to approve a consent order." },
  { q: "Is there an official child maintenance agreement template?", a: "Yes. gov.uk publishes a free form called Your child maintenance arrangement, which you can view online or download and print." },
  { q: "How often should we review our agreement?", a: "Citizens Advice suggests at least once a year, and gov.uk's form suggests every 6 months could work. Review sooner if jobs, homes or care arrangements change." },
  { q: "What can we do if a private arrangement stops working?", a: "Talk as soon as possible, or try a family mediator. If you can't agree, either parent can apply to the Child Maintenance Service, which can work out an amount and arrange payments." },
  { q: "Does an agreement have to be only about money?", a: "No. You can agree that one parent pays for things like school uniform, holidays or household bills instead of, or as well as, regular payments." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, Child Maintenance Service: make a private arrangement", url: "https://www.gov.uk/child-maintenance-service/private-arrangement" },
  { label: "gov.uk, Your child maintenance arrangement (form)", url: "https://www.gov.uk/government/publications/your-child-maintenance-arrangement/your-child-maintenance-arrangement-you-can-view-online" },
  { label: "gov.uk, Planning your child maintenance conversation", url: "https://www.gov.uk/government/publications/planning-your-child-maintenance-conversation/planning-your-child-maintenance-conversation-you-can-view-online" },
  { label: "gov.uk, Child Maintenance Service: eligibility", url: "https://www.gov.uk/child-maintenance-service/eligibility" },
  { label: "gov.uk, Money and property when a relationship ends: consent orders", url: "https://www.gov.uk/money-property-when-relationship-ends/apply-for-consent-order" },
  { label: "gov.uk, Money and property when a relationship ends: mediation", url: "https://www.gov.uk/money-property-when-relationship-ends/mediation" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "Citizens Advice, Check what child maintenance arrangement is right for you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/choosing-how-to-arrange-child-maintenance/check-what-child-maintenance-arrangement-is-right-for-you/" },
  { label: "Department for Work and Pensions, Separated families statistics: April 2014 to March 2025", url: "https://www.gov.uk/government/statistics/separated-families-statistics-april-2014-to-march-2025/separated-families-statistics-april-2014-to-march-2025" },
];

const ChildMaintenanceAgreement = () => (
  <ResourceArticle
    route="/resources/child-maintenance-agreement"
    seoTitle="Child Maintenance Agreement: What to Include | Collabor8"
    description="How to write a child maintenance agreement in the UK: what to include, how to review it, and why a written family arrangement isn't legally binding."
    h1="How to write a child maintenance agreement"
    crumbLabel="Child maintenance agreement"
    lead="A child maintenance agreement is a written record of what you've both agreed: how much is paid, by whom, when and how, plus how you'll handle extra costs and reviews. Writing it down makes things clear, but a private (family-based) arrangement isn't legally binding, even if you both sign it; only a court-approved consent order is."
    faq={faq}
    cta={{
      heading: "Agree the figure, then write it down",
      text: "Start with our free child maintenance calculator so you're both working from the same standard figure, then use it in your written agreement. Collabor8 keeps the shared record of what's been paid, so your agreement and your payments stay in one place.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: How to set up payments", to: "/resources/child-maintenance-guide#article-3" },
    }}
    ctaSmallPrint="This is general information, not legal advice."
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>What is a family-based arrangement?</H2>
    <P>A family-based arrangement, also called a private arrangement, is when you and your child's other parent agree child maintenance between yourselves, without the Child Maintenance Service (the government service that can work out and collect payments). gov.uk says no one else has to be involved, and that a private arrangement is flexible and can be changed if your circumstances change. gov.uk's planning guide adds that it doesn't cost anything to set up.</P>
    <P>It's a common route. According to the Department for Work and Pensions, 65% of separated families in Great Britain had a child maintenance arrangement in the year to March 2025, and around two thirds of those were arranged by parents themselves rather than through the Child Maintenance Service.</P>

    <H2>What to include in your agreement</H2>
    <P>gov.uk publishes a free form called <A href="https://www.gov.uk/government/publications/your-child-maintenance-arrangement/your-child-maintenance-arrangement-you-can-view-online">Your child maintenance arrangement</A>, which works well as a template. Between that form and Citizens Advice's checklist, a clear agreement covers:</P>
    <BList items={[
      <><strong>Your children's full names.</strong></>,
      <><strong>How much will be paid,</strong> and who pays it.</>,
      <><strong>How often and when,</strong> for example monthly on the 1st.</>,
      <><strong>How it will be paid.</strong> gov.uk says a standing order is best for making sure payments are made in full and on time, and it shows up on your bank statement.</>,
      <><strong>Extra costs.</strong> Whether the amount or date changes for things like birthdays or school trips, and who pays for childcare, school uniform or activities. Our page on <L to="/resources/what-does-child-maintenance-cover">what child maintenance covers</L> can help.</>,
      <><strong>A review date.</strong> Citizens Advice suggests reviewing at least every year. gov.uk's form suggests agreeing a date to talk, perhaps every 6 months.</>,
      <><strong>What happens if someone can't pay.</strong> gov.uk's form asks both parents to let the other know straight away.</>,
      <><strong>How you'll keep a record</strong> of payments made and received.</>,
    ]} />
    <P>You don't have to agree a fixed sum of money. Citizens Advice notes you could agree that the paying parent covers household bills, school uniforms or holidays, or the rent or mortgage on the home where your child lives.</P>

    <H2>How to work out the amount</H2>
    <P>It's up to you both. Citizens Advice suggests using the government's child maintenance calculator to see what the Child Maintenance Service would ask the paying parent to pay, and using that figure as a basis for your talks. Our free <L to="/child-maintenance-calculator">child maintenance calculator</L> follows the same standard formula. Citizens Advice also advises agreeing a realistic amount, because an amount that's too high could mean payments fall behind.</P>

    <H2>Is a child maintenance agreement legally binding?</H2>
    <P>No. This is the most important thing to get right, so here it is plainly.</P>
    <BList items={[
      <>A family-based arrangement <strong>is not legally binding</strong>, even if you write it down and both sign it. gov.uk's form says this directly: signing it is a way of showing your commitment to your children, not a legal document.</>,
      <>An agreement you reach in mediation isn't legally binding on its own either.</>,
      <>If you're getting divorced or ending a civil partnership, you can ask a court to approve a <strong>consent order</strong>, which makes the arrangement legally binding. Citizens Advice recommends getting legal advice if you want to do this.</>,
    ]} />
    <P>Writing your agreement down still matters. It makes clear what you agreed and gives you both something to look back on if your memories differ.</P>

    <H2>Do we need a solicitor?</H2>
    <P>Not to make a family-based arrangement. gov.uk says no one else has to be involved. You'd normally only need legal advice if you want a consent order. Citizens Advice says legal aid may be available for this if you've been affected by domestic abuse, or if you reached your agreement through mediation that was paid for by legal aid.</P>

    <H2>If the arrangement stops working</H2>
    <P>Talk to each other as soon as you can. gov.uk's form suggests doing this straight away, and a family mediator can help if you're both willing. If a private arrangement isn't working, or you can't agree, either parent can apply to the Child Maintenance Service, which can work out an amount and arrange payments. If you have a consent order, you can't use the Child Maintenance Service until it's at least a year old.</P>
    <P>For the basics of setting up payments, see our guide on <L to="/resources/child-maintenance-guide#article-3">how to set up payments</L>. If talking about it is the hard part, our page on <L to="/resources/talking-to-your-ex-about-money">talking to your ex about money</L> has practical tips.</P>
  </ResourceArticle>
);

export default ChildMaintenanceAgreement;
