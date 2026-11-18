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

interface Props {
  subject?: string
  text?: string
  test?: boolean
  kind?: string
}

const SafetyEmail = ({
  text = 'Collabor8: a safety flag needs review. Please check your email or the console.',
}: Props) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#FAF8F3', padding: '24px', color: '#111111' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '20px' }}>Collabor8</Heading>
        <Text style={{ margin: 0, color: '#1A1A18', lineHeight: '1.5' }}>{text}</Text>
      </Container>
      <Text style={{ textAlign: 'center', color: '#5C5C56', fontSize: '12px', marginTop: '16px' }}>
        - Collabor8
      </Text>
    </Body>
  </Html>
)

export const template = {
  component: SafetyEmail,
  subject: (data: Record<string, unknown>) =>
    typeof data.subject === 'string' ? data.subject : 'A safety flag needs review on Collabor8',
  displayName: 'Safeguarding alert (DSL)',
  previewData: {
    subject: 'A safety flag needs review on Collabor8',
    text: 'Collabor8: a safety flag needs review. Please check your email or the console.',
  },
} satisfies TemplateEntry
