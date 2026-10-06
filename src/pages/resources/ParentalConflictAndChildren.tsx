import ResourceArticle, { A, BList, H2, L, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "Is it bad for children to see their parents disagree?", a: "Everyday disagreements are common in families. Research for the Department for Work and Pensions highlights conflict that is frequent, intense and poorly resolved as the kind that puts children's mental health and long-term life chances at risk." },
  { q: "Does separation itself harm children?", a: "The Early Intervention Foundation review found that the quality of parents' relationship, parental stress and how the family functions all matter for children, in both together and separated families. It also noted these factors are closely linked, so it's hard to separate the effect of each." },
  { q: "At what age are children affected by conflict between parents?", a: "The review found children of all ages can be affected, from babies to teenagers. It notes that pre-school children are more likely to blame themselves." },
  { q: "How can we stop money arguments in front of the children?", a: "Talk when the children aren't around, agree how extra costs are split in advance, stick to the facts and keep a shared record. A family mediator can help if talks keep breaking down." },
  { q: "Where can we get help?", a: "A family mediator, Relate for counselling, and Cafcass guidance on listening to your child are good places to start. If you don't feel safe, the Child Maintenance Service can arrange maintenance without sharing your location." },
];

const sources: SourceItem[] = [
  { label: "Early Intervention Foundation for the Department for Work and Pensions (2016), What works to enhance inter-parental relationships and improve outcomes for children (full report)", url: "https://assets.publishing.service.gov.uk/media/5a7f447eed915d74e33f5600/what-works-to-enhance-inter-parental-relationships.pdf" },
  { label: "gov.uk, publication page for the review", url: "https://www.gov.uk/government/publications/what-works-to-enhance-inter-parental-relationships-and-improve-outcomes-for-children" },
  { label: "gov.uk, Planning your child maintenance conversation", url: "https://www.gov.uk/government/publications/planning-your-child-maintenance-conversation/planning-your-child-maintenance-conversation-you-can-view-online" },
  { label: "gov.uk, Child Maintenance Service: what child maintenance is", url: "https://www.gov.uk/child-maintenance-service" },
  { label: "gov.uk, Domestic abuse: how to get help", url: "https://www.gov.uk/guidance/domestic-abuse-how-to-get-help" },
  { label: "gov.uk, Making child arrangements: get help and support", url: "https://www.gov.uk/looking-after-children-divorce/get-help-and-support" },
  { label: "Family Mediation Council, Find a local mediator", url: "https://www.familymediationcouncil.org.uk/find-local-mediator/" },
];

const ParentalConflictAndChildren = () => (
  <ResourceArticle
    route="/resources/parental-conflict-and-children"
    seoTitle="How Parental Conflict Affects Children | Collabor8"
    description="Everyday disagreements are normal. Research for the government links frequent, unresolved conflict between parents to children's wellbeing. What helps."
    h1="How does conflict between parents affect children?"
    crumbLabel="Parental conflict and children"
    lead="Everyday disagreements are a normal part of family life; what research highlights is conflict between parents that is frequent, intense and poorly resolved. A 2016 review by the Early Intervention Foundation for the Department for Work and Pensions found that this kind of conflict puts children's mental health and long-term life chances at risk, whether parents are together or separated."
    faq={faq}
    cta={{
      heading: "Take the guesswork out of the numbers",
      text: "One way to take heat out of money talks is to start from the same figure. Our free child maintenance calculator shows the standard amount, and Collabor8 keeps the shared record of payments and expenses, so there's less to argue about.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: How to set up payments", to: "/resources/child-maintenance-guide#article-3" },
    }}
    smallPrint="Research summary checked against the full report on 6 October 2026."
    sources={sources}
  >
    <H2>Everyday disagreements are normal</H2>
    <P>All parents disagree sometimes. The 2016 review, written by the Early Intervention Foundation with researchers at the University of Sussex for the Department for Work and Pensions, notes that everyday conflict between couples and parents is common in families. What it focuses on is a particular kind of conflict: conflict that is <strong>frequent, intense and poorly resolved</strong>.</P>

    <H2>What the research found</H2>
    <P>The review brought together research on how the relationship between parents affects children. Among its findings:</P>
    <BList items={[
      "How parents communicate and relate to each other is increasingly recognised as a primary influence on parenting, and on children's long-term mental health and future life chances.",
      "Frequent, intense and poorly resolved conflict between parents puts children's mental health and long-term life chances at risk.",
      "Children of all ages can be affected, from infancy through childhood and adolescence.",
      "Conflict between parents has also been linked with how well children do at school, including among children in the UK.",
      "It can affect a child's relationship with each parent.",
      "The quality of parents' relationship, parental stress and how the family functions matter for children in both together and separated families.",
    ]} />
    <P>The review describes links and risks, not certainties. It doesn't say every argument harms a child, and it didn't look at money in particular.</P>

    <H2>How children make sense of conflict</H2>
    <P>The review explains that children try to work out why conflict is happening and who is to blame. Children who blame themselves for their parents' disagreements, or feel responsible for not stopping them, can feel guilt, shame and sadness. It also notes that pre-school children are more likely to blame themselves. That's one reason to keep adult disagreements away from children, and to reassure them that the grown-ups' disagreements are not their fault.</P>

    <H2>Why money conversations matter after separation</H2>
    <P>When parents separate, money doesn't stop being a shared topic. Regular child maintenance, school costs and birthdays mean you may be talking about money for years. Each of those conversations is a chance to show your children that disagreements can be handled calmly and settled.</P>

    <H2>Practical steps to keep money talks calm</H2>
    <BList items={[
      <><strong>Keep children out of it.</strong> Talk when the children aren't around, as gov.uk's guide to <A href="https://www.gov.uk/government/publications/planning-your-child-maintenance-conversation/planning-your-child-maintenance-conversation-you-can-view-online">planning a child maintenance conversation</A> suggests. Don't ask a child to pass on messages or money.</>,
      <><strong>Choose a time and a channel.</strong> A set time, or messages instead of face to face, can lower the temperature.</>,
      <><strong>Start from shared facts.</strong> Using the same <L to="/child-maintenance-calculator">calculator</L> figure, or looking at the same record of payments, means fewer numbers to argue about.</>,
      <><strong>Agree the rules for extras in advance,</strong> so each new cost isn't a fresh negotiation. See <L to="/resources/what-does-child-maintenance-cover">what child maintenance covers</L>.</>,
      <><strong>Mind your words.</strong> gov.uk suggests avoiding phrases like "you never..." or "you always...", which can make a conversation much harder.</>,
      <><strong>Pause when you need to.</strong> It's fine to stop and come back to it another day.</>,
      <><strong>Bring in help.</strong> A family mediator can help you reach an agreement. You can search on the <A href="https://www.familymediationcouncil.org.uk/find-local-mediator/">Family Mediation Council</A> website.</>,
    ]} />
    <P>Our page on <L to="/resources/talking-to-your-ex-about-money">talking to your ex about money</L> goes into more detail, and our <L to="/resources/financial-coparenting-tips">co-parenting finance tips</L> are a quick refresher.</P>

    <H2>When conflict isn't safe</H2>
    <P>Disagreement is different from abuse. If you're afraid of your child's other parent, you don't have to negotiate with them directly. gov.uk says the Child Maintenance Service (the government service that can work out and arrange payments) can arrange child maintenance without the other parent knowing your location or personal information. gov.uk also explains <A href="https://www.gov.uk/guidance/domestic-abuse-how-to-get-help">how to get help with domestic abuse</A>.</P>

    <H2>Support for you and your children</H2>
    <P>gov.uk points to support including Relate for counselling, Cafcass guidance on listening to your child when you separate, and Childline advice for children whose parents are separating. You can find these on gov.uk's <A href="https://www.gov.uk/looking-after-children-divorce/get-help-and-support">getting help and support</A> page.</P>
  </ResourceArticle>
);

export default ParentalConflictAndChildren;
