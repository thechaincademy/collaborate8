// Deploy target: supabase/functions/_shared/transactional-email-templates/premium-renewal-reminder.tsx
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  renewalDate?: string
  portalLink?: string
}

const PremiumRenewalReminder = ({
  renewalDate = 'your renewal date',
  portalLink = 'https://collaborate8.com/dashboard?tab=chat&conversation-tool=manage',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Collabor8 premium renews on {renewalDate}</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
          Your Collabor8 premium renews on {renewalDate}
        </Heading>
        <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.6 }}>
          Your Collabor8 premium (£4.99 a month, billed as £59.88 a year) renews automatically on {renewalDate}. We will charge £59.88 to your saved card.
        </Text>
        <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.6 }}>
          If you want to cancel, open Collabor8, go to the Chat financial conversation tool and choose Manage subscription, or use this link: <Link href={portalLink} style={{ color: '#111111' }}>{portalLink}</Link>
        </Text>
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Link href={portalLink} style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}>
            Manage subscription
          </Link>
        </Section>
        <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
          If you cancel before {renewalDate}, you will not be charged and you keep access until then.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PremiumRenewalReminder,
  subject: (d: Record<string, any>) => `Your Collabor8 premium renews on ${d.renewalDate ?? 'your renewal date'}`,
  displayName: 'Premium renewal reminder',
  previewData: { renewalDate: '22 October 2027' },
} satisfies TemplateEntry
