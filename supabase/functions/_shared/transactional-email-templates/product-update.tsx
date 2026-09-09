import * as React from 'npm:react@18.3.1'
import {
  Body,
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

interface Update {
  title: string
  what: string
  why: string
}

interface ProductUpdateProps {
  name?: string
  period?: string
  updates?: Update[]
}

const defaultUpdates: Update[] = [
  {
    title: 'Set up your maintenance arrangement step by step',
    what:
      'Setting up a monthly child maintenance payment is now a simple guided flow: the amount, how often, the first payment date, then a review before you confirm. Each step turns green once it is done.',
    why: 'You can see exactly where you are, and nothing is sent until you have checked the summary.',
  },
  {
    title: 'You no longer need your co-parent to be linked first',
    what:
      'Open the Maintenance page, tell us whether you are the paying or the receiving parent, and you can start straight away. If you pick the wrong one, there is a link at the bottom to switch back.',
    why: 'You can get organised in your own time instead of waiting for the other parent.',
  },
  {
    title: 'Invite your co-parent from your profile',
    what:
      'If your co-parent is not connected yet, your profile now shows your unique invite code. Tap it to copy it, or enter their email and we will send them the invite for you.',
    why: 'Linking is the step that unlocks shared payments, so it is now much harder to lose the code.',
  },
  {
    title: 'A clear monthly snapshot on your home page',
    what:
      'Your home page shows your activity for the last month, split into monthly payments and expenses, plus the current status of your co-parent link.',
    why: 'One glance tells you what has gone out and whether anything needs your attention.',
  },
  {
    title: 'Statements you can download',
    what:
      'Tap either figure on your home page to see a full statement. It starts with the last 3 months, and you can switch to 6 months, 12 months or all time, then download it.',
    why: 'Handy if you ever need to show a record of what has been paid.',
  },
  {
    title: 'Signing in is simpler',
    what:
      'You can now create your account or sign in with Apple as well as by email, and the password rules are shorter and tell you clearly what is still missing.',
    why: 'Fewer failed attempts, faster start.',
  },
  {
    title: 'A friendlier "coming soon"',
    what:
      'Chat, Expenses and Rewards are still being built. Tapping them now shows a short "coming soon" note instead of an unfinished screen.',
    why: 'You always know what is ready to use today.',
  },
]

export const ProductUpdate = ({
  name = '',
  period = 'this month',
  updates = defaultUpdates,
}: ProductUpdateProps) => {
  const greeting = name ? `Hi ${name}` : 'Hi there'
  const list = updates && updates.length ? updates : defaultUpdates

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>What is new in Collabor8 {period}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>What is new in Collabor8</Heading>
          <Text style={sub}>A short round-up of what we improved {period}.</Text>
          <Text style={p}>{greeting},</Text>
          <Text style={p}>
            We have been busy making Collabor8 easier to use. Here is what changed, what it does
            and why it might help you.
          </Text>
          {list.map((update) => (
            <Section key={update.title} style={card}>
              <Text style={cardTitle}>{update.title}</Text>
              <Text style={cardBody}>{update.what}</Text>
              <Text style={cardWhy}>Why it helps: {update.why}</Text>
            </Section>
          ))}
          <Hr style={hr} />
          <Text style={p}>
            If anything is unclear, or there is something you wish the app did, just reply - or
            write to us at{' '}
            <Link href="mailto:jade@collaborate8.com" style={link}>
              jade@collaborate8.com
            </Link>{' '}
            or{' '}
            <Link href="mailto:rafa@collaborate8.com" style={link}>
              rafa@collaborate8.com
            </Link>
            . A real person will answer.
          </Text>
          <Text style={{ ...p, marginBottom: '4px' }}>Warm wishes,</Text>
          <Text style={p}>
            <strong>Jade &amp; Rafa</strong>
            <br />
            Founders, Collabor8
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProductUpdate,
  subject: 'What is new in Collabor8',
  displayName: 'Product update round-up',
  previewData: { name: 'Rafa', period: 'this month' },
} satisfies TemplateEntry

const main = {
  margin: 0,
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#111111',
  padding: '24px',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '8px 16px' }
const h1 = { margin: '0 0 6px', fontSize: '22px' }
const sub = { margin: '0 0 20px', fontSize: '14px', color: '#6b6b6b' }
const p = { margin: '0 0 14px', lineHeight: 1.6, fontSize: '15px' }
const card = {
  backgroundColor: '#FAF8F3',
  borderRadius: '14px',
  padding: '16px 18px',
  marginBottom: '12px',
}
const cardTitle = { margin: '0 0 8px', fontSize: '16px', fontWeight: 'bold' as const }
const cardBody = { margin: '0 0 8px', lineHeight: 1.6, fontSize: '14px' }
const cardWhy = { margin: 0, lineHeight: 1.6, fontSize: '14px', color: '#8a6a10' }
const hr = { borderColor: '#eeeae0', margin: '24px 0' }
const link = { color: '#D4A017' }
