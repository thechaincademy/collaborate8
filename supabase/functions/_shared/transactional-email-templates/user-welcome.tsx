import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface UserWelcomeProps {
  name?: string
}

export const UserWelcome = ({ name = '' }: UserWelcomeProps) => {
  const greeting = name ? `Hi ${name}` : 'Hi there'

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, backgroundColor: '#FAF8F3', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111111', padding: '24px' }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
          <Heading style={{ margin: '0 0 24px', fontSize: '22px' }}>Welcome to Collabor8</Heading>
          <Text style={{ margin: '0 0 18px', lineHeight: 1.6 }}>{greeting},</Text>
          <Text style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
            We are Jade and Rafa, the founders of Collabor8. Thank you for joining us. We built this because we know that talking about money after separation is one of the hardest conversations parents face, and we wanted to make it simpler - for both parents.
          </Text>
          <Text style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
            You do not have to have it all figured out to get started. Collabor8 is here to help you open the conversation, at your own pace, in a space that is separate from everything else.
          </Text>
          <Text style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
            If getting that first conversation started feels daunting, our Self-Guided Financial Conversation Tool is a good place to begin. We send an introductory email to your co-parent on your behalf, invite them to complete a short questionnaire privately, and follow up with them so you do not have to, keeping the space calm and focused without the costs of financial mediation.
          </Text>
          <Text style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
            Many parents also use Collabor8 to set up and manage child maintenance payments, take advantage of the ability to pay by credit card and earn rewards, or simply bring some certainty and structure to their schedule. However you choose to use it, Collabor8 is your one-stop hub for co-parenting finances.
          </Text>
          <Text style={{ margin: '28px 0 4px', lineHeight: 1.6 }}>Warm wishes,</Text>
          <Text style={{ margin: 0, lineHeight: 1.6 }}>
            <strong>Jade and Rafa</strong>
            <br />
            Founders, Collabor8
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: UserWelcome,
  subject: 'Welcome to Collabor8 — your account is ready',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry
