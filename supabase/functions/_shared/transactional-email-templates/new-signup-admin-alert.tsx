import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface NewSignupAdminAlertProps {
  email?: string
  name?: string
  signedUpAt?: string
}

export const NewSignupAdminAlert = ({
  email = '-',
  name = '-',
  signedUpAt = '-',
}: NewSignupAdminAlertProps) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#FAF8F3', padding: '24px', color: '#111111' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '20px' }}>New user signed up</Heading>
        <Text style={{ margin: '0 0 8px', color: '#444444' }}>
          <strong>Email:</strong> {email || '-'}
        </Text>
        <Text style={{ margin: '0 0 8px', color: '#444444' }}>
          <strong>Name:</strong> {name || '-'}
        </Text>
        <Text style={{ margin: 0, color: '#444444' }}>
          <strong>When:</strong> {signedUpAt || '-'}
        </Text>
      </Container>
      <Text style={{ textAlign: 'center', color: '#999999', fontSize: '12px', marginTop: '16px' }}>
        - Collabor8
      </Text>
    </Body>
  </Html>
)

export const template = {
  component: NewSignupAdminAlert,
  subject: (data: Record<string, any>) =>
    `New Collabor8 signup: ${data.email || 'unknown'}`,
  displayName: 'New signup alert (founders)',
  previewData: { email: 'parent@example.com', name: 'Alex', signedUpAt: '09 Sep 2026 14:00 UTC' },
} satisfies TemplateEntry
