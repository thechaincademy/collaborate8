import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  confirmUrl?: string
}

const AccountDeletionConfirm = ({ confirmUrl = 'https://collaborate8.com/delete-account' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm you want to delete your Collabor8 account</Preview>
    <Body style={{ margin: 0, backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
      <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px', borderRadius: '16px', backgroundColor: '#FAF8F3' }}>
        <Heading style={{ margin: '0 0 12px', fontSize: '22px' }}>Delete your Collabor8 account</Heading>
        <Text style={{ margin: '0 0 16px', color: '#444444', lineHeight: 1.6 }}>
          We received a request to delete the Collabor8 account for this email address. If this was you, tap the button below.
          This link works once and expires in 24 hours.
        </Text>
        <Text style={{ margin: '0 0 20px', color: '#444444', lineHeight: 1.6 }}>
          If you want a copy of your data, sign in and download it from Settings before you confirm.
        </Text>
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Link href={confirmUrl} style={{ display: 'inline-block', backgroundColor: '#D4A017', color: '#111111', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 600 }}>
            Delete my account
          </Link>
        </Section>
        <Text style={{ margin: 0, color: '#777777', fontSize: '13px', lineHeight: 1.5 }}>
          If you didn't ask for this, you can ignore this email. Your account will stay as it is.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletionConfirm,
  subject: 'Confirm deleting your Collabor8 account',
  displayName: 'Account deletion confirmation',
  previewData: { confirmUrl: 'https://collaborate8.com/delete-account?token=example' },
} satisfies TemplateEntry
