import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface UserWelcomeProps {
  name?: string
}

const features = [
  'Link with your co-parent using your unique invite code.',
  'Set up child maintenance payments - choose the amount, how often, and the first payment date.',
  'Share and track expenses with receipts, so nothing is disputed later.',
  'See a clear statement of activity over 3, 6 or 12 months, and download it whenever you need it.',
  'Chat with a supportive tool that helps keep conversations constructive.',
  'Guides and tools, including a child maintenance calculator based on the standard UK rules.',
]

export const UserWelcome = ({ name = '' }: UserWelcomeProps) => {
  const greeting = name ? `Hi ${name}` : 'Hi there'

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, backgroundColor: '#FAF8F3', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
          <Heading style={{ margin: '0 0 16px', fontSize: '22px' }}>Welcome to Collabor8</Heading>
          <Text style={{ margin: '0 0 14px', lineHeight: 1.6 }}>{greeting},</Text>
          <Text style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
            We are Jade and Rafa, the founders of Collabor8. Thank you for joining us - we built
            this after seeing how stressful money can be between separated parents, and we would
            love to make it simpler for you.
          </Text>
          <Text style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
            Here is what you can do inside the app:
          </Text>
          {features.map((feature) => (
            <Text key={feature} style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
              - {feature}
            </Text>
          ))}
          <Text style={{ margin: '14px 0', lineHeight: 1.6 }}>
            If you get stuck or just want to talk something through, reply to this email or write to
            us directly at{' '}
            <Link href="mailto:jade@collaborate8.com" style={{ color: '#D4A017' }}>
              jade@collaborate8.com
            </Link>{' '}
            or{' '}
            <Link href="mailto:rafa@collaborate8.com" style={{ color: '#D4A017' }}>
              rafa@collaborate8.com
            </Link>
            . A real person will answer.
          </Text>
          <Text style={{ margin: '0 0 4px', lineHeight: 1.6 }}>Warm wishes,</Text>
          <Text style={{ margin: 0, lineHeight: 1.6 }}>
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
  component: UserWelcome,
  subject: 'Welcome to Collabor8 - here is how we can help',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry
