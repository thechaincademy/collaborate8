import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://collaborate8.com'

interface ConversationToolInviteProps {
  inviteCode?: string
  senderName?: string
}

export const ConversationToolInvite = ({
  inviteCode = 'ABC123',
  senderName = 'Your co-parent',
}: ConversationToolInviteProps) => {
  const inviteUrl = `${APP_URL}/signup/invited?code=${encodeURIComponent(inviteCode)}`

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, backgroundColor: '#FAF8F3', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
          <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
            {senderName} invited you to complete a financial conversation on Collabor8
          </Heading>
          <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.5 }}>
            {senderName} has invited you to take part in the Self-Guided Financial Conversation Tool on Collabor8. It is a private, structured way for both parents to share what they would like to discuss about child maintenance and shared expenses - before any direct conversation takes place.
          </Text>
          <Text style={{ margin: '0 0 20px', color: '#444444', fontSize: '13px', lineHeight: 1.5 }}>
            This is an automated email sent on behalf of your co-parent via Collabor8. Your email address was shared with us solely for the purpose of this invitation. We will send one automated reminder if you have not responded within seven days and a final automated notice at fourteen days. We will not store your email address on our system beyond this process and it will be deleted within thirty days if no engagement occurs. We will not contact you for any other purpose.
          </Text>
          <Section style={{ textAlign: 'center', padding: '20px', backgroundColor: '#FAF8F3', borderRadius: '12px', margin: '0 0 20px' }}>
            <Text style={{ margin: '0 0 6px', fontSize: '12px', color: '#666666', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Your invite code
            </Text>
            <Text style={{ margin: 0, fontSize: '32px', fontWeight: 700, letterSpacing: '6px', color: '#D4A017' }}>
              {inviteCode}
            </Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '0 0 20px' }}>
            <Link
              href={inviteUrl}
              style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}
            >
              Get started
            </Link>
          </Section>
          <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
            Or open {APP_URL}/signup/invited and enter the code manually.
          </Text>
        </Container>
        <Text style={{ textAlign: 'center', color: '#999999', fontSize: '12px', marginTop: '16px' }}>
          - Collabor8
        </Text>
      </Body>
    </Html>
  )
}

export const template = {
  component: ConversationToolInvite,
  subject: (data: Record<string, any>) =>
    `${data.senderName || 'Your co-parent'} invited you to complete a financial conversation on Collabor8`,
  displayName: 'Conversation tool invite',
  previewData: { inviteCode: 'ABC123', senderName: 'Jade' },
} satisfies TemplateEntry
