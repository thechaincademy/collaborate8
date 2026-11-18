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

interface ManualPaymentReminderProps {
  firstName?: string
  amountLabel?: string
  holderName?: string
}

export const ManualPaymentReminder = ({
  firstName = 'there',
  amountLabel = '',
  holderName = 'your co-parent',
}: ManualPaymentReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Pay through Stripe in the Collabor8 app</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
          Your payment is due today
        </Heading>
        <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.6 }}>
          Hi {firstName}, pay {holderName}{amountLabel ? ` ${amountLabel}` : ''} today through Stripe in the Collabor8 app.
        </Text>
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Link
            href={`${APP_URL}/dashboard?tab=maintenance`}
            style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}
          >
            Pay in the app
          </Link>
        </Section>
        <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
          Collabor8 takes this payment through Stripe. Do not send it from your own bank using stored account details.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ManualPaymentReminder,
  subject: 'Pay through Stripe in the Collabor8 app',
  displayName: 'Payment due reminder',
  previewData: {
    firstName: 'Alex',
    amountLabel: '£250.00',
    holderName: 'Jordan',
  },
} satisfies TemplateEntry
