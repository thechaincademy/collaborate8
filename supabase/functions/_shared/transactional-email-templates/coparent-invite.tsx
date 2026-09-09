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
    <Html>
      <Head />
      <Body style={{ margin: 0, backgroundColor: '#FAF8F3', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
          <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
            {senderName} invited you to Collabor8
          </Heading>
          <Text style={{ margin: '0 0 20px', color: '#444444', lineHeight: 1.5 }}>
            Collabor8 helps separated parents manage child maintenance payments together. Use the
            code below to link your account when you sign up.
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
              Create your account
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
  component: CoparentInvite,
  subject: (data: Record<string, any>) =>
    `${data.senderName || 'Your co-parent'} invited you to Collabor8`,
  displayName: 'Co-parent invite',
  previewData: { inviteCode: 'ABC123', senderName: 'Jade' },
} satisfies TemplateEntry
