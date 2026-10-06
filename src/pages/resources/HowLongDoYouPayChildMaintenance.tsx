import ResourceArticle, { A, BList, H2, L, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "Does child maintenance stop when my child turns 16?", a: "Not always. If your child stays in approved full-time education or training, such as A levels or T Levels, child maintenance can continue until they leave or turn 20, whichever comes first." },
  { q: "Do I have to pay child maintenance while my child is at university?", a: "Not through the Child Maintenance Service. It stops if your child starts an advanced course, such as a degree. In a family-based arrangement, you can both agree to keep contributing if you want to." },
  { q: "Does an apprenticeship count as approved training?", a: "No. gov.uk excludes intermediate and advanced apprenticeships, and courses that are part of a job contract. Approved training must be unpaid." },
  { q: "What happens if my child leaves college early?", a: "Tell the Child Benefit Office. If your child is no longer in approved education or training, Child Maintenance Service payments will stop." },
  { q: "Do missed payments still have to be paid after child maintenance ends?", a: "They may. gov.uk says the paying parent might still need to make payments after regular child maintenance stops if they've missed payments in the past." },
  { q: "Can the amount change before my child turns 16?", a: "Yes. Through the Child Maintenance Service it's reviewed every 12 months and can change sooner if you report a change. In a family-based arrangement, you can change it whenever you both agree." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, Child Maintenance Service: what child maintenance is", url: "https://www.gov.uk/child-maintenance-service" },
  { label: "gov.uk, Child Maintenance Service: when child maintenance stops", url: "https://www.gov.uk/child-maintenance-service/when-child-maintenance-stops" },
  { label: "gov.uk, Child Maintenance Service: changes you need to report", url: "https://www.gov.uk/child-maintenance-service/change-of-circumstances" },
  { label: "gov.uk, Child Maintenance Service: making and receiving payments (annual review, mandatory reconsideration)", url: "https://www.gov.uk/child-maintenance-service/payments" },
  { label: "gov.uk, How child maintenance is worked out: when payments can change", url: "https://www.gov.uk/how-child-maintenance-is-worked-out/when-payments-can-change" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "Citizens Advice, Check what child maintenance arrangement is right for you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/choosing-how-to-arrange-child-maintenance/check-what-child-maintenance-arrangement-is-right-for-you/" },
];

const HowLongDoYouPayChildMaintenance = () => (
  <ResourceArticle
    route="/resources/how-long-do-you-pay-child-maintenance"
    seoTitle="How Long Do You Pay Child Maintenance? UK | Collabor8"
    description="Child maintenance usually runs until your child is 16, or under 20 if they stay in approved education or training. What counts, and what changes it."
    h1="How long do you pay child maintenance for?"
    crumbLabel="How long you pay child maintenance"
    lead="You usually pay child maintenance until your child turns 16, or until they turn 20 if they stay in approved full-time education or training that isn't advanced, such as A levels or T Levels. It ends sooner if they leave that education or training, and the amount can change along the way when your circumstances change."
    faq={faq}
    cta={{
      heading: "Check the figure when things change",
      text: "Whenever income, overnight stays or your child's education changes, run our free child maintenance calculator again so you're both looking at the same up-to-date figure. Collabor8 keeps the shared record of every payment, so each review starts from the facts.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: Rights and responsibilities", to: "/resources/child-maintenance-guide#article-5" },
    }}
    ctaSmallPrint="This is general information, not legal advice."
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>The basic rule</H2>
    <P>gov.uk says you must have a child maintenance arrangement if your child is under 16, or under 20 if they're in approved education or training. Through the Child Maintenance Service (the government service that can work out and arrange payments), child maintenance ends when your child leaves approved education or training, or turns 20, whichever happens first.</P>
    <P>So the key moments to plan for are your child's 16th birthday and the end of school or college.</P>

    <H2>What counts as approved education or training</H2>
    <P>For the Child Maintenance Service, education must be full-time. gov.uk defines this as more than an average of 12 hours a week of supervised study or course-related work experience. A child with an illness or disability can do fewer hours if that's appropriate for them.</P>
    <P>Courses that can count include:</P>
    <BList items={[
      "A levels or similar, such as the International Baccalaureate",
      "T Levels",
      "GCSEs",
      "Scottish Highers and National 5s",
      "NVQs and most vocational qualifications up to level 3",
      "home education, in some cases",
      "traineeships in England",
    ]} />
    <P>Your child must be accepted onto the course before they turn 19.</P>
    <P>Things that don't count:</P>
    <BList items={[
      <>"advanced" courses, such as a university degree or a BTEC Higher National Certificate</>,
      "courses paid for by an employer",
      "intermediate and advanced apprenticeships, and courses that are part of a job contract",
    ]} />
    <P>Approved training must be unpaid. gov.uk lists examples of approved training schemes in Wales, Scotland and Northern Ireland.</P>

    <H2>How payments stop</H2>
    <P>gov.uk explains that child maintenance is linked to Child Benefit. You should tell the Child Benefit Office if your child:</P>
    <BList items={[
      "stays in education or training after turning 16",
      "starts a new education or training course",
      "leaves an education or training course before it's complete",
    ]} />
    <P>Through the Child Maintenance Service, payments stop automatically when your child turns 20 (after their birthday). If they complete a course, payments stop on the last day of February, May, August or November, whichever comes first.</P>
    <P>If any payments were missed in the past, the paying parent might still need to pay those after regular child maintenance stops.</P>

    <H2>If you have a family-based arrangement</H2>
    <P>If you arrange child maintenance between yourselves, you decide together how long it runs. It helps to write down what will happen when your child turns 16 and when they finish school or college, so neither of you is caught out. You can agree to keep contributing after that, for example while your child is at university, but that's a choice you make together, not something the Child Maintenance Service would require. Our page on <L to="/resources/child-maintenance-agreement">writing a child maintenance agreement</L> explains what to include.</P>

    <H2>What happens when circumstances change</H2>
    <P>Child maintenance can run for many years, and a lot can change in that time.</P>
    <P>Through the Child Maintenance Service:</P>
    <BList items={[
      "the amount is reviewed every 12 months, called the annual review",
      "you must report certain changes as soon as they happen, rather than waiting for the review",
      "these include a change in who the child's main carer is, a change to how often the child stays overnight with the paying parent that affects payments, moving house, and the paying parent's income changing by 25% or more",
      "either parent can ask for other income or expenses to be taken into account, called applying for a variation",
      "if you think a decision is wrong, you can ask for it to be looked at again within one month, called a mandatory reconsideration",
    ]} />
    <P>In a family-based arrangement, nothing changes unless you both agree. Citizens Advice suggests reviewing it at least every year, and using the calculator to agree a reasonable new amount, for example when the paying parent starts a new job. Our page on <L to="/resources/is-my-child-maintenance-fair">whether your child maintenance is fair</L> explains what affects the figure.</P>

    <H2>Planning for the long run</H2>
    <P>A few simple habits make the years ahead easier for both of you:</P>
    <BList items={[
      "put your review date, your child's 16th birthday and the end of their course in both your calendars",
      "keep a running record of what's been paid, so any review starts from shared facts",
      <>re-check the figure with our free <L to="/child-maintenance-calculator">child maintenance calculator</L> whenever income or overnight stays change</>,
    ]} />
    <P>For more on each parent's rights, see our guide to <L to="/resources/child-maintenance-guide#article-5">rights and responsibilities</L>.</P>
  </ResourceArticle>
);

export default HowLongDoYouPayChildMaintenance;
