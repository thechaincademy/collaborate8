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
  sortCode?: string
  accountNumber?: string
  paymentReference?: string
}

export const ManualPaymentReminder = ({
  firstName = 'there',
  amountLabel = '',
  holderName = 'Your co-parent',
  sortCode = '00-00-00',
  accountNumber = '00000000',
  paymentReference = '',
}: ManualPaymentReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your child maintenance payment is due today</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '22px', color: '#111111' }}>
          Your payment is due today
        </Heading>
        <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.6 }}>
          Hi {firstName}, this is a reminder to send {amountLabel ? `${amountLabel} ` : 'your '}
          child maintenance payment from your own bank today.
        </Text>
        <Section style={{ margin: '0 0 20px', padding: '16px', borderRadius: '12px', backgroundColor: '#FAF8F3' }}>
          <Text style={{ margin: '0 0 6px', color: '#111111', fontSize: '14px' }}>
            <strong>Account name:</strong> {holderName}
          </Text>
          <Text style={{ margin: '0 0 6px', color: '#111111', fontSize: '14px' }}>
            <strong>Sort code:</strong> {sortCode}
          </Text>
          <Text style={{ margin: '0 0 6px', color: '#111111', fontSize: '14px' }}>
            <strong>Account number:</strong> {accountNumber}
          </Text>
          {paymentReference ? (
            <Text style={{ margin: 0, color: '#111111', fontSize: '14px' }}>
              <strong>Reference:</strong> {paymentReference}
            </Text>
          ) : null}
        </Section>
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Link
            href={`${APP_URL}/coparent-bank-account`}
            style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}
          >
            Record this payment
          </Link>
        </Section>
        <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
          Collabor8 does not move this money for you. Once you have sent it, record it in the app so
          it appears in your statements.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ManualPaymentReminder,
  subject: 'Your child maintenance payment is due today',
  displayName: 'Manual payment reminder',
  previewData: {
    firstName: 'Alex',
    amountLabel: '£250.00',
    holderName: 'J Smith',
    sortCode: '20-00-00',
    accountNumber: '12345678',
    paymentReference: 'MAINTENANCE',
  },
} satisfies TemplateEntry
