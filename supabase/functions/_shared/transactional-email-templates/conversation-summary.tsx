import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  agreements?: string[]
  topics?: string[]
  startingFigure?: string
  coparentNote?: string | null
  nextSteps?: string
  nextStepsLinks?: { label: string; url: string }[]
  chatUrl?: string
}

const Email = ({
  agreements = [],
  topics = [],
  startingFigure,
  coparentNote,
  nextSteps,
  nextStepsLinks = [],
  chatUrl = 'https://collaborate8.com',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your financial conversation summary is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={intro}>
          Both you and your co-parent have completed the Self-Guided Financial Conversation Tool.
          Your shared summary is below.
        </Text>

        <Heading style={h2}>Where you both agree</Heading>
        {agreements.length > 0 ? (
          agreements.map((item) => (
            <Text key={item} style={listItem}>
              &#9656; {item}
            </Text>
          ))
        ) : (
          <Text style={text}>
            You did not select the same statements at this stage. That is a normal starting point -
            your financial chat is the place to explore it.
          </Text>
        )}

        <Hr style={hr} />

        <Heading style={h2}>Topics for your financial conversation</Heading>
        {topics.length > 0 ? (
          topics.map((item, i) => (
            <Text key={item} style={listItem}>
              {i + 1}. {item}
            </Text>
          ))
        ) : (
          <Text style={text}>
            No specific topics were flagged by either of you. Your financial chat is open whenever
            you are ready to begin.
          </Text>
        )}

        <Hr style={hr} />

        <Heading style={h2}>Suggested starting figure</Heading>
        <Text style={text}>
          {startingFigure ||
            'You have indicated you would like to discuss the maintenance amount directly. Your financial chat is the right place for that conversation.'}
        </Text>

        {coparentNote ? (
          <>
            <Hr style={hr} />
            <Heading style={h2}>A note from your co-parent</Heading>
            <Text style={quote}>{coparentNote}</Text>
          </>
        ) : null}

        <Hr style={hr} />

        <Heading style={h2}>Suggested next steps</Heading>
        <Text style={text}>{nextSteps}</Text>
        {nextStepsLinks.map((l) => (
          <Text key={l.url} style={listItem}>
            &#9656; <Link href={l.url} style={link}>{l.label}</Link>
          </Text>
        ))}

        <Section style={{ marginTop: '28px' }}>
          <Button href={chatUrl} style={button}>
            Open my financial chat
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Collabor8 - <Link href="https://collaborate8.com" style={link}>collaborate8.com</Link>
        </Text>
        <Text style={footer}>
          This is an automated summary generated from your individual responses. Collabor8 is a
          financial conversation platform, not a professional mediation service.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your financial conversation summary is ready',
  displayName: 'Financial conversation summary',
  previewData: {
    agreements: [
      'Both parents want what is best for our child',
      'A regular maintenance payment should be in place',
    ],
    topics: ['Agreeing a maintenance amount', 'School fees or trips'],
    startingFigure:
      'Based on the income band shared and the CMS statutory formula, a suggested starting figure is around £58 per week for one child. This is an estimate only.',
    coparentNote: 'I would like us to keep this simple and get something in place soon.',
    nextSteps:
      'Your financial chat is ready. We suggest starting with Agreeing a maintenance amount. Your summary is pinned at the top of your chat.',
    nextStepsLinks: [],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const intro = { fontSize: '15px', lineHeight: '24px', color: '#1a1a1a' }
const h2 = { fontSize: '16px', color: '#0f2740', margin: '24px 0 8px' }
const text = { fontSize: '14px', lineHeight: '22px', color: '#1a1a1a' }
const listItem = { fontSize: '14px', lineHeight: '22px', color: '#1a1a1a', margin: '4px 0' }
const quote = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1a1a1a',
  borderLeft: '3px solid #D4A017',
  paddingLeft: '12px',
  fontStyle: 'italic' as const,
}
const hr = { borderColor: '#eae5da', margin: '24px 0' }
const link = { color: '#0f2740' }
const button = {
  backgroundColor: '#D4A017',
  color: '#1a1a1a',
  padding: '12px 20px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const footer = { fontSize: '12px', lineHeight: '18px', color: '#6b6b6b' }
