import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Uptime alert for Collabor8 admins. Carries service names, times, response
// times and HTTP status codes only. Never parent data, message text or secrets.
interface Props {
  event?: 'down' | 'recovered'
  test?: boolean
  service?: string
  problem?: string | null
  checkedAt?: string
  responseMs?: number | null
  downSince?: string | null
}

const label = { padding: '6px 12px 6px 0', color: '#5C5C56', fontSize: '14px', verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const }
const value = { padding: '6px 0', color: '#1A1A18', fontSize: '14px', fontWeight: 600 as const }

export const serviceAlertSubject = (event: 'down' | 'recovered', test: boolean) =>
  `${test ? '[TEST] ' : ''}${event === 'down' ? 'Service down' : 'Service recovered'}`

const ServiceStatusAlert = ({
  event = 'down',
  service = 'Backend database & API',
  problem = null,
  checkedAt = '',
  responseMs = null,
  downSince = null,
}: Props) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#FAF8F3', padding: '24px', color: '#111111' }}>
      <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px' }}>
        <Heading style={{ margin: '0 0 8px', fontSize: '20px', color: event === 'down' ? '#B42318' : '#067647' }}>
          {event === 'down' ? 'Service down' : 'Service recovered'}
        </Heading>
        <Text style={{ margin: '0 0 16px', color: '#1A1A18', lineHeight: '1.5' }}>
          {event === 'down'
            ? 'Automated monitoring found a problem with the platform.'
            : 'Automated monitoring confirms the platform is reachable again.'}
        </Text>
        <Section>
          <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={label}>Service</td><td style={value}>{service}</td></tr>
              {event === 'down' && problem ? <tr><td style={label}>Problem</td><td style={value}>{problem}</td></tr> : null}
              <tr><td style={label}>Checked at</td><td style={value}>{checkedAt}</td></tr>
              <tr><td style={label}>Response time</td><td style={value}>{responseMs === null || responseMs === undefined ? 'No response' : `${responseMs} ms`}</td></tr>
              {downSince ? <tr><td style={label}>Down since</td><td style={value}>{downSince}</td></tr> : null}
            </tbody>
          </table>
        </Section>
      </Container>
      <Text style={{ textAlign: 'center', color: '#5C5C56', fontSize: '12px', marginTop: '16px' }}>
        Collabor8 automated uptime monitoring. Checks run every 5 minutes.
      </Text>
    </Body>
  </Html>
)

export const template = {
  component: ServiceStatusAlert,
  subject: (data: Record<string, unknown>) =>
    serviceAlertSubject(data.event === 'recovered' ? 'recovered' : 'down', data.test === true),
  displayName: 'Service down or recovered (admins)',
  previewData: {
    event: 'recovered',
    service: 'Backend database & API',
    checkedAt: '2026-11-18 18:20:52 UTC',
    responseMs: 664,
    downSince: '2026-11-18 17:47:23 UTC',
  },
} satisfies TemplateEntry
