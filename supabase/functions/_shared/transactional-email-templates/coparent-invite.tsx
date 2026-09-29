import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://collaborate8.com'

interface CoparentInviteProps {
  inviteCode?: string
  senderName?: string
}

export const CoparentInvite = ({
  inviteCode = 'ABC123',
  senderName = 'Your co-parent',
}: CoparentInviteProps) => {
  const inviteUrl = `${APP_URL}/signup/invited?code=${encodeURIComponent(inviteCode)}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${senderName} has invited you to discuss finances on Collabor8`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={p}>Hi,</Text>
          <Text style={p}>
            Managing finances after separation is one of the hardest conversations parents face. Collabor8 gives you a dedicated, neutral space to have that conversation, on your own terms, away from everything else.
          </Text>
          <Text style={p}>
            {senderName} has invited you to join them on Collabor8. There is no obligation to engage straight away. This is simply an invitation to have a look.
          </Text>

          <Heading as="h2" style={h2}>What is Collabor8?</Heading>
          <Text style={p}>
            Collabor8 gives separated parents somewhere to have the financial conversations that matter, including child maintenance, shared expenses and financial arrangements, in one place, separate from everything else in their lives. It is low cost, straightforward to use and designed to make financial conversations between co-parents simpler and less stressful.
          </Text>

          <Heading as="h2" style={h2}>What you can do on Collabor8:</Heading>
          <Text style={li}>• Use the child maintenance calculator to understand what maintenance should look like for your family.</Text>
          <Text style={li}>• Discuss finances in a dedicated chat, away from other communications.</Text>
          <Text style={li}>• Manage and track shared expenses.</Text>
          <Text style={{ ...li, marginBottom: '16px' }}>• Keep a clear record of everything discussed and agreed.</Text>

          <Text style={p}>
            To accept the invitation and join {senderName} on Collabor8, use the code below:
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{inviteCode}</Text>
          </Section>

          <Text style={p}>
            <strong>Join Collabor8 now: </strong>
            <Link href={inviteUrl} style={link}>collaborate8.com</Link>
          </Text>
          <Text style={p}>
            Or visit <Link href={APP_URL} style={link}>collaborate8.com</Link> and enter your code when prompted.
          </Text>
          <Text style={p}>
            This invitation was sent on behalf of {senderName}. If you have any questions about Collabor8 before joining, visit{' '}
            <Link href={`${APP_URL}/faq`} style={link}>collaborate8.com/faq</Link> or email us at{' '}
            <Link href="mailto:jade@collaborate8.com" style={link}>jade@collaborate8.com</Link>.
          </Text>
          <Text style={{ ...p, marginBottom: 0 }}>
            Kind regards,<br />
            The Collabor8 Team<br />
            <Link href={APP_URL} style={link}>collaborate8.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CoparentInvite,
  subject: (data: Record<string, any>) =>
    `${data.senderName || 'Your co-parent'} has invited you to discuss finances on Collabor8`,
  displayName: 'Co-parent invite',
  previewData: { inviteCode: 'ABC123', senderName: 'Jade' },
} satisfies TemplateEntry

const main = { margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '8px 4px' }
const p = { margin: '0 0 16px', fontSize: '15px', color: '#333333', lineHeight: 1.6 }
const li = { margin: '0 0 6px', fontSize: '15px', color: '#333333', lineHeight: 1.6 }
const h2 = { margin: '8px 0 10px', fontSize: '17px', fontWeight: 700, color: '#111111' }
const codeBox = { textAlign: 'center' as const, padding: '20px', backgroundColor: '#FAF8F3', border: '2px solid #D4A017', borderRadius: '12px', margin: '0 0 20px' }
const codeText = { margin: 0, fontSize: '34px', fontWeight: 700, letterSpacing: '6px', color: '#111111' }
const link = { color: '#B8860B', textDecoration: 'underline' }
