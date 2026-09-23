import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { title?: string; message?: string; url?: string }

const CoparentNotification = ({ title = 'You have an update on Collabor8', message = '', url = 'https://collaborate8.com/dashboard' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '22px' }}>{title}</Heading>
        {message ? <Text style={{ margin: '0 0 20px', color: '#444444', lineHeight: 1.6 }}>{message}</Text> : null}
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Link href={url} style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}>
            Open Collabor8
          </Link>
        </Section>
        <Text style={{ margin: 0, color: '#777777', fontSize: '13px' }}>You are receiving this because of activity on your Collabor8 account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CoparentNotification,
  subject: (d: Record<string, any>) => d.title || 'You have an update on Collabor8',
  displayName: 'Co-parent notification',
  previewData: { title: 'New expense needs your approval', message: 'Your co-parent added "School trip" for £45.00.' },
} satisfies TemplateEntry
