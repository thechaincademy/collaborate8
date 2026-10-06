import ResourceArticle, { A, BList, H2, L, P, type FaqItem, type SourceItem } from "@/components/resources/ResourceArticle";

const faq: FaqItem[] = [
  { q: "What's the best way to bring up child maintenance with my ex?", a: "Pick a calm time when the children aren't around, say what you'd like to talk about, and suggest you both look at the calculator first so you start from the same figure." },
  { q: "Is it better to talk in person or by message?", a: "Whichever helps you both stay calm. gov.uk suggests text, email or phone if meeting in person won't work. Messages can also leave you both with a record of what was said." },
  { q: "Can someone else join the conversation?", a: "Yes, if you both trust them and they can stay calm and neutral. Let the other parent know in advance. A professional family mediator is another option." },
  { q: "What if my ex won't talk about money at all?", a: "You could suggest a family mediator. If you can't agree, the Child Maintenance Service can work out an amount and arrange payments." },
  { q: "What should we write down after we agree?", a: "The amount, who pays, how often and how, how extra costs are handled, and a review date. gov.uk's free Your child maintenance arrangement form covers all of these." },
];

const sources: SourceItem[] = [
  { label: "gov.uk, Planning your child maintenance conversation", url: "https://www.gov.uk/government/publications/planning-your-child-maintenance-conversation/planning-your-child-maintenance-conversation-you-can-view-online" },
  { label: "gov.uk, Your child maintenance arrangement (form)", url: "https://www.gov.uk/government/publications/your-child-maintenance-arrangement/your-child-maintenance-arrangement-you-can-view-online" },
  { label: "gov.uk, Child Maintenance Service: make a private arrangement", url: "https://www.gov.uk/child-maintenance-service/private-arrangement" },
  { label: "gov.uk, Child Maintenance Service: what child maintenance is", url: "https://www.gov.uk/child-maintenance-service" },
  { label: "Citizens Advice, Agreeing maintenance between you", url: "https://www.citizensadvice.org.uk/family/children-and-young-people/child-maintenance1/making-a-private-child-maintenance-arrangement/agreeing-maintenance-between-you/" },
  { label: "Family Mediation Council, Find a local mediator", url: "https://www.familymediationcouncil.org.uk/find-local-mediator/" },
];

const TalkingToYourExAboutMoney = () => (
  <ResourceArticle
    route="/resources/talking-to-your-ex-about-money"
    seoTitle="How to Talk to Your Ex About Money Calmly | Collabor8"
    description="Calm, practical steps for talking to your ex about child maintenance and shared costs without a row: prepare, start with facts, write it down, review."
    h1="How to talk to your ex about child maintenance without a row"
    crumbLabel="Talking to your ex about money"
    lead="Plan the conversation before you have it: know what you want to agree, start from a shared figure such as the child maintenance calculator, pick a calm time when the children aren't around, and stick to the facts. Afterwards, write down what you agreed so neither of you has to rely on memory."
    faq={faq}
    cta={{
      heading: "Start from the same number",
      text: "Before your next conversation, both run our free child maintenance calculator so you're looking at the same standard figure. Once you've agreed, Collabor8 keeps the shared record of payments and expenses, so money talks don't have to happen over and over.",
      button: { label: "Try the free calculator", to: "/child-maintenance-calculator" },
      link: { label: "Read: Co-parenting finance tips", to: "/resources/financial-coparenting-tips" },
    }}
    smallPrint={<>Checked against gov.uk and Citizens Advice on 6 October 2026. If you live in Northern Ireland, <A href="https://www.nidirect.gov.uk/articles/private-child-maintenance-arrangements">nidirect.gov.uk</A> has its own child maintenance guidance.</>}
    sources={sources}
  >
    <H2>Before you talk</H2>
    <P>gov.uk publishes a short guide to <A href="https://www.gov.uk/government/publications/planning-your-child-maintenance-conversation/planning-your-child-maintenance-conversation-you-can-view-online">planning your child maintenance conversation</A>. Its main suggestions, plus one of ours:</P>
    <BList items={[
      <><strong>Write a list</strong> of everything you want to talk about. Decide which things matter most, and which you're prepared to compromise on.</>,
      <><strong>Talk it through</strong> with a friend or family member first, to spot any questions you've missed.</>,
      <><strong>Suggest your ex prepares too.</strong> gov.uk suggests asking the other parent to work through the guide separately, so you both arrive with a plan.</>,
      <><strong>Start from the same figure.</strong> Each run our free <L to="/child-maintenance-calculator">child maintenance calculator</L>, or the one on gov.uk, before you talk. It's easier to discuss a number when you've both seen where it comes from.</>,
    ]} />

    <H2>Choose how, where and when</H2>
    <BList items={[
      <><strong>Where:</strong> somewhere you'll both feel able to talk. That might be somewhere private, or a public place like a café or a park.</>,
      <><strong>How:</strong> if meeting in person won't work, use text, email or phone, and agree a time.</>,
      <><strong>When:</strong> when the children aren't around, and when you have plenty of time. gov.uk suggests not arranging it when you have to be at work in an hour, or at pick-up or drop-off.</>,
    ]} />

    <H2>Should anyone else be there?</H2>
    <P>You could ask a friend or relative to join you, if you both trust them and they can stay calm and neutral. Tell the other parent beforehand so they know what to expect. A professional family mediator is another option.</P>

    <H2>During the conversation</H2>
    <BList items={[
      <><strong>Start with the easy things.</strong> gov.uk suggests starting with what you can easily agree on, to find some common ground.</>,
      <><strong>Be polite and listen.</strong> Treat the other parent as you'd want to be treated, and listen to what they're saying.</>,
      <><strong>Avoid accusations.</strong> gov.uk singles out phrases like "you never..." and "you always..." as ones that can make the conversation much harder.</>,
      <><strong>Keep it about the children.</strong> Money for school shoes isn't a verdict on your relationship.</>,
      <><strong>Stop if it's going wrong.</strong> Agree to pick it up another day, or carry on in writing.</>,
    ]} />

    <H2>Phrases that can help</H2>
    <BList items={[
      "\"I've run the calculator and got this figure. Could you run it too, and we'll compare?\"",
      "\"Can we agree how we'll split school trips before the next letter comes home?\"",
      "\"I can't manage the full amount this month. Can we talk about a plan?\"",
      "\"Shall we write this down so we both remember it the same way?\"",
      "\"Can we set a date to look at this again in six months?\"",
    ]} />

    <H2>After you talk</H2>
    <BList items={[
      <><strong>Write it down.</strong> gov.uk's free <A href="https://www.gov.uk/government/publications/your-child-maintenance-arrangement/your-child-maintenance-arrangement-you-can-view-online">Your child maintenance arrangement</A> form covers the amount, who pays, how often and how, extra costs and a review date. It isn't legally binding, but it gives you both a clear record. Our page on <L to="/resources/child-maintenance-agreement">writing a child maintenance agreement</L> explains more.</>,
      <><strong>Set up a standing order.</strong> gov.uk says it's the best way to make sure payments are made in full and on time, and it's recorded on your bank statement.</>,
      <><strong>Keep a record</strong> of payments and shared costs. Citizens Advice recommends this to avoid disagreements in future.</>,
      <><strong>Speak up early.</strong> gov.uk's form asks parents to let each other know straight away if they can't keep to the arrangement.</>,
    ]} />
    <P>If extra costs are a sticking point, see <L to="/resources/what-does-child-maintenance-cover">what child maintenance covers</L>. For why calm conversations matter for children, see <L to="/resources/parental-conflict-and-children">how conflict between parents affects children</L>.</P>

    <H2>If talking keeps turning into a row</H2>
    <P>Some conversations need more support. A family mediator can help you both reach an agreement, and you can search on the <A href="https://www.familymediationcouncil.org.uk/find-local-mediator/">Family Mediation Council</A> website. If you can't agree, or you feel at risk talking to the other parent, gov.uk says you might be able to use the Child Maintenance Service (the government service that can work out an amount and arrange payments), so you don't need to negotiate directly. It can also arrange child maintenance without the other parent knowing your location or personal information.</P>
  </ResourceArticle>
);

export default TalkingToYourExAboutMoney;
