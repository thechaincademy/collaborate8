import ResourceArticle, { A, BList, H2, H3, L, P, Table, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "Is child maintenance worked out on gross or take-home pay?", a: "Gross. The Child Maintenance Service uses the paying parent's income before tax, using information from HM Revenue and Customs, and turns it into a weekly figure." },
  { q: "Does having my child to stay overnight reduce what I pay?", a: "It can. If you agree your child stays with you at least 52 nights a year, the amount for each child goes down, from 14.29% up to 50% plus £7 a week at 175 nights or more. Payments can't go below £7 a week." },
  { q: "Do other children I support affect the amount?", a: "Yes. The Child Maintenance Service takes into account other children the paying parent pays maintenance for, including children who live with them." },
  { q: "What if the paying parent earns more than £3,000 a week?", a: "The standard calculation covers gross weekly income up to £3,000. Above that, the receiving parent can apply to the courts for extra child maintenance." },
  { q: "Can we ask for the figure to be looked at again?", a: "Yes. Through the Child Maintenance Service you can ask for a mandatory reconsideration within one month of a decision, or apply for a variation for other income or expenses. In a family-based arrangement, you can review it whenever you both agree." },
  { q: "Is the Collabor8 calculator official?", a: "No. It follows the standard Child Maintenance Service formula to give you an estimate. For an official figure, use the calculator on gov.uk or contact the Child Maintenance Service." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, How child maintenance is worked out (rates and shared care)", url: "https://www.gov.uk/how-child-maintenance-is-worked-out" },
  { label: "gov.uk, Asking for other income and expenses to be included (variations)", url: "https://www.gov.uk/how-child-maintenance-is-worked-out/ask-other-income-expenses-included" },
  { label: "gov.uk, When payments can change", url: "https://www.gov.uk/how-child-maintenance-is-worked-out/when-payments-can-change" },
  { label: "gov.uk, Child Maintenance Service: changes you need to report", url: "https://www.gov.uk/child-maintenance-service/change-of-circumstances" },
  { label: "gov.uk, Child Maintenance Service: making and receiving payments (annual review, mandatory reconsideration)", url: "https://www.gov.uk/child-maintenance-service/payments" },
  { label: "gov.uk, Cost of living support", url: "https://www.gov.uk/cost-of-living" },
  { label: "gov.uk, Child maintenance calculator", url: "https://www.gov.uk/calculate-child-maintenance" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "Citizens Advice, Check what child maintenance arrangement is right for you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/choosing-how-to-arrange-child-maintenance/check-what-child-maintenance-arrangement-is-right-for-you/" },
];

const IsMyChildMaintenanceFair = () => (
  <ResourceArticle
    route="/resources/is-my-child-maintenance-fair"
    seoTitle="Is My Child Maintenance Fair? UK Guide | Collabor8"
    description="How UK child maintenance is worked out: gross income, number of children, overnight stays and other children. Both parents' views, and how to review."
    h1="Is my child maintenance fair?"
    crumbLabel="Is my child maintenance fair?"
    lead="A good way to judge whether your child maintenance is fair is to compare it with the figure the Child Maintenance Service would work out, which is based on the paying parent's gross income, the number of children, overnight stays and any other children they support. If your amount is far from that figure, or your circumstances have changed, it may be time to review it together."
    faq={faq}
    cta={{
      heading: "See the standard figure for your family",
      text: "Our free child maintenance calculator uses the standard formula, including overnight stays and other children, so you can both see where the number comes from. Collabor8 keeps the shared record of what's been paid, so any review starts from the same facts.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: Who pays, and how much", to: "/resources/child-maintenance-guide#article-2" },
    }}
    ctaSmallPrint="This is general information, not legal advice."
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>How the standard figure is worked out</H2>
    <P>The Child Maintenance Service is the government service that can calculate and arrange child maintenance. gov.uk says it usually follows six steps. The figures below were checked on gov.uk on 6 October 2026.</P>

    <H3>Steps 1 and 2: income</H3>
    <P>The service finds the paying parent's yearly gross income (before tax) using information from HM Revenue and Customs, and checks whether they get benefits. The paying parent is the parent who doesn't have main day-to-day care of the child. The receiving parent is the one who does. Some things can change the gross figure, such as pension payments. The yearly figure is then turned into a weekly one.</P>

    <H3>Step 3: the rate</H3>
    <P>One of five rates applies, based on the paying parent's gross weekly income:</P>
    <Table
      head={["Paying parent's gross weekly income", "Rate", "Weekly amount"]}
      rows={[
        ["Unknown or not provided", "Default", "£38 for 1 child, £51 for 2 children, £64 for 3 or more"],
        ["Below £7", "Nil", "£0"],
        ["£7 to £100, or gets benefits", "Flat", "£7"],
        ["£100.01 to £199.99", "Reduced", "Worked out using a formula"],
        ["£200 to £3,000", "Basic", "Worked out using a formula"],
      ]}
    />
    <P>If the paying parent's gross weekly income is more than £3,000, the receiving parent can apply to the courts for extra child maintenance.</P>

    <H3>Steps 4 and 5: other children and the weekly amount</H3>
    <P>The service takes into account the number of children the paying parent pays child maintenance for, including other children living with them. It then sets the weekly amount.</P>

    <H3>Step 6: shared care</H3>
    <P>If you agree that your child stays overnight with the paying parent for at least 52 nights a year, the amount for each child can go down (on the reduced and basic rates):</P>
    <Table
      head={["Agreed overnight stays each year", "Reduction for each child"]}
      rows={[
        ["52 to 103 nights", "14.29%"],
        ["104 to 155 nights", "28.57%"],
        ["156 to 174 nights", "42.86%"],
        ["175 nights or more", "50%, plus an extra £7 a week"],
      ]}
    />
    <P>Payments can't go below £7 a week. If you agree on at least 52 nights but not the exact number, the service assumes 52. Different rules apply on the flat rate. Our free <L to="/child-maintenance-calculator">child maintenance calculator</L> uses this standard formula to give you an estimate.</P>

    <H2>If you're the paying parent</H2>
    <BList items={[
      <>The figure uses <strong>gross income</strong>, before tax, so it can look high compared with your take-home pay.</>,
      <><strong>Overnight stays count</strong> when they're agreed, and each band reduces the amount for each child.</>,
      <><strong>Other children you support</strong> are taken into account.</>,
      <>You can ask for certain <strong>expenses</strong> to be considered, such as the cost of keeping in regular contact with your child (for example, travel), repaying debts from your previous relationship, or mortgage payments on the home you used to share if the other parent and your child still live there. Each expense must be more than £10 a week. This is called applying for a variation.</>,
      "If your income changes by 25% or more, or you no longer have an income, report it straight away.",
      <>If money is tight, gov.uk has a page on <A href="https://www.gov.uk/cost-of-living">cost of living support</A>.</>,
    ]} />

    <H2>If you're the receiving parent</H2>
    <BList items={[
      <>Child maintenance is a <strong>contribution</strong> to your child's costs. Citizens Advice notes that the Child Maintenance Service doesn't take extra costs such as a child's education or disability into account, so you'd need to go to court to ask for more for those.</>,
      <>You can ask for the paying parent's <strong>other income</strong> to be considered, such as rental income or savings interest over £2,500 a year, or assets worth more than £31,250.</>,
      <>If you think a decision is wrong, you can ask for a <strong>mandatory reconsideration</strong> within one month of the decision.</>,
      "If you think the other parent has given incorrect information, you can report it.",
    ]} />

    <H2>In a family-based arrangement</H2>
    <P>If you arrange child maintenance yourselves, you can agree any amount. Citizens Advice suggests using the calculator figure as a basis for your conversation, and agreeing an amount that's realistic so payments don't fall behind. Fairness isn't only about the weekly figure. Being clear about <L to="/resources/what-does-child-maintenance-cover">extra costs</L> and paying reliably matter just as much.</P>

    <H2>Reviewing what you pay or receive</H2>
    <BList items={[
      <><strong>Through the Child Maintenance Service:</strong> the amount is reviewed every 12 months. It can change sooner if one of you reports a change, applies for a variation, or your agreement on overnight stays changes.</>,
      <><strong>In a family-based arrangement:</strong> Citizens Advice suggests reviewing at least every year. Run the calculator again with up-to-date figures, compare it with what's paid now, and talk it through.</>,
    ]} />
    <P>Our pages on <L to="/resources/child-maintenance-agreement">writing a child maintenance agreement</L> and <L to="/resources/talking-to-your-ex-about-money">talking to your ex about money</L> can help with the next step. For more on who pays, see our guide to <L to="/resources/child-maintenance-guide#article-2">who pays, and how much</L>.</P>
  </ResourceArticle>
);

export default IsMyChildMaintenanceFair;
