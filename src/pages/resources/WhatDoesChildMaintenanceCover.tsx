import ResourceArticle, { A, BList, H2, L, OList, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "Does child maintenance cover school uniform?", a: "It can, if you both agree. There's no official list of what child maintenance pays for. In a family-based arrangement you decide whether uniform comes out of the regular payment or is split separately. The Child Maintenance Service works out one weekly amount and doesn't add a separate sum for uniform." },
  { q: "Should the paying parent pay half of school trips?", a: "Only if that's what you agree. You could split trips half each, split them by income, or include them in the regular payment. It helps to agree this before the next trip letter comes home." },
  { q: "Does the Child Maintenance Service add extra for clubs or activities?", a: "No. It works out a single weekly amount towards everyday living costs. Citizens Advice says it doesn't take extra costs such as education into account, so extras need to be agreed between you or, in some cases, through a court." },
  { q: "Does child maintenance cover the dentist?", a: "In England, NHS dental appointments and treatment are free for children under 18, or under 19 and in full-time education. Private treatment is a cost to agree between you, like any other extra." },
  { q: "Do we need to keep receipts for extra costs?", a: "It's a good idea. Citizens Advice recommends keeping a record of all payments made and received, which helps avoid disagreements later." },
  { q: "Can we change how we split extras later?", a: "Yes. gov.uk says a private arrangement is flexible and can be changed if your circumstances change. Agree a review date so you both know when you'll look at it again." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, Child Maintenance Service: what child maintenance is", url: "https://www.gov.uk/child-maintenance-service" },
  { label: "gov.uk, Child Maintenance Service: make a private arrangement", url: "https://www.gov.uk/child-maintenance-service/private-arrangement" },
  { label: "gov.uk, Working out the cost of raising your children", url: "https://www.gov.uk/government/publications/working-out-the-cost-of-raising-your-children/working-out-the-cost-of-raising-your-children-you-can-view-online" },
  { label: "gov.uk, Your child maintenance arrangement (form)", url: "https://www.gov.uk/government/publications/your-child-maintenance-arrangement/your-child-maintenance-arrangement-you-can-view-online" },
  { label: "gov.uk, School uniform", url: "https://www.gov.uk/school-uniform" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "Citizens Advice, Check what child maintenance arrangement is right for you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/choosing-how-to-arrange-child-maintenance/check-what-child-maintenance-arrangement-is-right-for-you/" },
  { label: "NHS, Who can get free NHS dental treatment", url: "https://www.nhs.uk/nhs-services/dentists/who-can-get-free-nhs-dental-treatment/" },
  { label: "Family Mediation Council, Find a local mediator", url: "https://www.familymediationcouncil.org.uk/find-local-mediator/" },
];

const WhatDoesChildMaintenanceCover = () => (
  <ResourceArticle
    route="/resources/what-does-child-maintenance-cover"
    seoTitle="What Does Child Maintenance Cover? UK Guide | Collabor8"
    description="Does child maintenance cover school uniform, trips, clubs or the dentist? What it is for, and simple ways UK parents can split extra costs fairly."
    h1="What does child maintenance cover?"
    crumbLabel="What child maintenance covers"
    lead="Child maintenance is a contribution towards your child's everyday living costs when one parent doesn't live with them, and there is no official list of what it must pay for. That means extras like school uniform, trips, clubs and private dental care are covered only if you both agree, so it helps to decide how you'll split them before the bills arrive."
    faq={faq}
    cta={{
      heading: "Start with the standard figure",
      text: "Use our free child maintenance calculator to see the standard weekly figure, then list your extra costs and agree how you'll split them. Collabor8 keeps the shared record of payments and expenses for both of you, so nobody has to rely on memory.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: Shared and additional expenses", to: "/resources/child-maintenance-guide#article-4" },
    }}
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>What child maintenance is for</H2>
    <P>gov.uk describes child maintenance as covering how your child's living costs will be paid when one of the parents doesn't live with the child. Both parents are responsible for those costs, even if one of them doesn't see the child.</P>
    <P>If the Child Maintenance Service (the government service that can work out and arrange payments) calculates your payments, you get one weekly amount. It isn't split into food, clothes or school costs. It's a contribution towards your child's everyday life as a whole.</P>
    <P>If you arrange things between yourselves, called a <L to="/resources/child-maintenance-agreement">family-based arrangement</L>, there are no fixed rules. You decide together what the money is for and who pays for what.</P>

    <H2>Is school uniform, a school trip or a club included?</H2>
    <P>There's no official list, so the honest answer is that it depends on what you agree.</P>
    <BList items={[
      <><strong>Through the Child Maintenance Service:</strong> the weekly amount goes towards general living costs. It doesn't add separate amounts for uniform or clubs. Citizens Advice explains that the service doesn't take extra costs such as a child's education or disability into account, and that a parent would need to go to court to ask for more for those.</>,
      <><strong>In a family-based arrangement:</strong> you can include whatever you both agree. gov.uk gives the example of one parent paying for things like housing, school uniform, trips or clubs. Citizens Advice mentions one parent covering a holiday or school uniforms instead of making regular payments.</>,
    ]} />
    <P>So uniform, trips and clubs can be part of your regular child maintenance, or paid on top of it. What matters is that you've both agreed which.</P>

    <H2>The extra costs worth talking about</H2>
    <P>gov.uk's worksheet for <A href="https://www.gov.uk/government/publications/working-out-the-cost-of-raising-your-children/working-out-the-cost-of-raising-your-children-you-can-view-online">working out the cost of raising your children</A> lists the kinds of things parents can include. For school-age children, it's a good starting list:</P>
    <BList items={[
      "school uniform and other clothing",
      "school trips",
      "activities, including sports and social clubs",
      "childcare, including the school holidays",
      "travel",
      "toys, books and other play items",
      "larger items, such as a bike, a computer or, for older children, a mobile phone",
    ]} />
    <P>gov.uk's arrangement form also mentions birthdays as an extra cost to plan for.</P>
    <P>Health costs come up too. In England, NHS dental appointments and treatment are free for children under 18, or under 19 and in full-time education. So the dentist question is usually only about private treatment.</P>

    <H2>Ways to split extra costs</H2>
    <P>gov.uk's worksheet says you might want to split the cost equally, or change it depending on what you both agree. Here are four ways to do it:</P>
    <OList items={[
      <><strong>Half each.</strong> Simple, and easy for both of you to check.</>,
      <><strong>In proportion to income.</strong> The parent who earns more pays a bigger share. This can feel fairer when your incomes are very different.</>,
      <><strong>One parent per category.</strong> For example, one of you buys uniform and the other pays for clubs. Fewer transfers, but check it stays roughly balanced over the year.</>,
      <><strong>A set monthly amount for extras.</strong> A small fixed sum on top of regular maintenance, so most small costs are already covered.</>,
    ]} />
    <P>There's no single right answer. The best option is the one you'll both still be happy with in a year's time.</P>

    <H2>Agree the process, not just the split</H2>
    <P>An unexpected bill is much easier to handle when you've already agreed what happens next. A few simple rules help:</P>
    <BList items={[
      <><strong>A check-in amount.</strong> Agree that anything over a set figure is discussed before it's booked or bought.</>,
      <><strong>Receipts.</strong> Agree how you'll share them and how quickly the other parent pays their part.</>,
      <><strong>Timing.</strong> gov.uk's arrangement form asks whether the amount or payment date will change to help with extra expenses, such as birthdays or school trips. Decide this up front.</>,
      <><strong>A record.</strong> Citizens Advice recommends keeping a record of all the payments you make or receive, to avoid disagreements in future.</>,
    ]} />
    <P>Our guide to <L to="/resources/child-maintenance-guide#article-4">shared and additional expenses</L> has more on this, and our page on <L to="/resources/talking-to-your-ex-about-money">talking to your ex about money</L> can help if the conversation feels hard to start.</P>

    <H2>If money for school costs is tight</H2>
    <P>gov.uk says that if you can't afford school uniform or PE kit, you should contact the headteacher to check what support is available. In England, your local council may be able to help with uniform costs. gov.uk also says that from September 2026, schools should not require parents to buy more than 3 branded uniform items, or 4 at secondary and middle schools if one of them is a tie.</P>

    <H2>If you can't agree</H2>
    <P>A family mediator can help you both find an arrangement that works. You can search for one on the <A href="https://www.familymediationcouncil.org.uk/find-local-mediator/">Family Mediation Council</A> website. If you can't agree, or you don't feel safe talking to the other parent, the Child Maintenance Service can work out an amount, although it won't split extra costs for you. To see the standard figure first, try our free <L to="/child-maintenance-calculator">child maintenance calculator</L>.</P>
  </ResourceArticle>
);

export default WhatDoesChildMaintenanceCover;
