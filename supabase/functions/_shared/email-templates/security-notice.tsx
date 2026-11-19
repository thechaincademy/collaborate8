/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SecurityNoticeEmailProps {
  siteName: string
  siteUrl: string
  message: string
}

export const SecurityNoticeEmail = ({
  siteName,
  siteUrl,
  message,
}: SecurityNoticeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Security notice from {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Security notice</Heading>
        <Text style={text}>{message}</Text>
        <Text style={text}>
          If this was you, there's nothing else to do. If it wasn't, reset your
          password on{' '}
          <Link href={`${siteUrl}/forgot-password`} style={link}>
            {siteName}
          </Link>{' '}
          straight away.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SecurityNoticeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
