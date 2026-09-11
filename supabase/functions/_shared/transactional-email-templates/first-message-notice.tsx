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

interface FirstMessageNoticeProps {
  inviteCode?: string
}

export const FirstMessageNotice = ({ inviteCode = 'ABC123' }: FirstMessageNoticeProps) => {
  const inviteUrl = `${APP_URL}/signup/invited?code=${encodeURIComponent(inviteCode)}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your co-parent has reached out on Collabor8</Preview>
      <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
          <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
            Your co-parent has reached out on Collabor8
          </Heading>
          <Text style={{ margin: '0 0 20px', color: '#444444', lineHeight: 1.6 }}>
            Your co-parent has joined Collabor8 and has written you a message in the financial chat.
            Collabor8 is a platform for separated parents to discuss and manage finances away from
            everything else. To read their message and respond, join Collabor8 using the link below.
            Your co-parent's message will be waiting for you when you do.
          </Text>
          <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
            <Link
              href={inviteUrl}
              style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}
            >
              Join Collabor8
            </Link>
          </Section>
          <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
            This is an automated email sent on behalf of your co-parent via Collabor8. We will not
            contact you again in relation to this message beyond this notification.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FirstMessageNotice,
  subject: 'Your co-parent has reached out on Collabor8',
  displayName: 'First message notice',
  previewData: { inviteCode: 'ABC123' },
} satisfies TemplateEntry
