// Deploy target: supabase/functions/_shared/transactional-email-templates/founder-welcome.tsx
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { FounderSignature } from './founder-signature.tsx'

interface Props {
  firstName?: string
}

const p = { margin: '0 0 18px', lineHeight: 1.6, color: '#111111', fontSize: '15px' }

const FounderWelcome = ({ firstName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A personal welcome from Rafa and Jade</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '8px 4px' }}>
        <Text style={p}>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Text>
        <Text style={p}>Thank you for joining Collabor8. Jade and I wanted to welcome you personally.</Text>
        <Text style={p}>
          We built Collabor8 to give co-parents one calm place to share child costs, agree them and talk about money without the back and forth.
        </Text>
        <Text style={p}>
          We'd love to jump on a short call to walk you through the app, understand your situation and how we can help, and hear any feedback you have. Just reply to this email with a time that suits you and we'll make it work.
        </Text>
        <Text style={{ ...p, margin: 0 }}>
          Warm wishes,
          <br />
          Rafa and Jade
        </Text>
        <FounderSignature />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FounderWelcome,
  subject: (d: Record<string, any>) => (d.firstName ? `Welcome to Collabor8, ${d.firstName}` : 'Welcome to Collabor8'),
  displayName: 'Founder welcome (24 hours after signup)',
  previewData: { firstName: 'Alex' },
} satisfies TemplateEntry
