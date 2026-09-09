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

interface TabRow {
  name?: string
  clicks?: number
  users?: number
}

interface AdminWeeklyReportProps {
  periodLabel?: string
  newUsers?: number
  totalUsers?: number
  activeUsers?: number
  totalEvents?: number
  linkedPairs?: number
  paymentsCount?: number
  paymentsTotal?: number
  expensesCount?: number
  tabs?: TabRow[]
  dashboardUrl?: string
}

const row = { margin: '0 0 6px', color: '#444444', fontSize: '14px' }

export const AdminWeeklyReport = ({
  periodLabel = 'last 7 days',
  newUsers = 0,
  totalUsers = 0,
  activeUsers = 0,
  totalEvents = 0,
  linkedPairs = 0,
  paymentsCount = 0,
  paymentsTotal = 0,
  expensesCount = 0,
  tabs = [],
  dashboardUrl = 'https://collaborate8.com/admin',
}: AdminWeeklyReportProps) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#FAF8F3', padding: '24px', color: '#111111' }}>
      <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px' }}>
        <Heading style={{ margin: '0 0 4px', fontSize: '20px' }}>Collabor8 weekly report</Heading>
        <Text style={{ margin: '0 0 20px', color: '#777777', fontSize: '13px' }}>{periodLabel}</Text>

        <Text style={row}><strong>New sign ups:</strong> {newUsers}</Text>
        <Text style={row}><strong>Total users:</strong> {totalUsers}</Text>
        <Text style={row}><strong>Active users:</strong> {activeUsers}</Text>
        <Text style={row}><strong>Linked co-parents:</strong> {linkedPairs}</Text>
        <Text style={row}><strong>Payments:</strong> {paymentsCount} (£{Number(paymentsTotal || 0).toFixed(2)})</Text>
        <Text style={row}><strong>Expenses raised:</strong> {expensesCount}</Text>
        <Text style={{ ...row, marginBottom: '20px' }}><strong>Screen views / clicks:</strong> {totalEvents}</Text>

        <Heading as="h2" style={{ fontSize: '16px', margin: '0 0 8px' }}>Most used tabs</Heading>
        {tabs.length === 0 ? (
          <Text style={row}>No activity recorded this week.</Text>
        ) : (
          tabs.map((t) => (
            <Text key={t.name} style={row}>
              {t.name} - {t.clicks} clicks, {t.users} users
            </Text>
          ))
        )}

        <Text style={{ margin: '24px 0 0', fontSize: '14px' }}>
          Full dashboard: {dashboardUrl}
        </Text>
      </Container>
      <Text style={{ textAlign: 'center', color: '#999999', fontSize: '12px', marginTop: '16px' }}>
        - Collabor8
      </Text>
    </Body>
  </Html>
)

export const template = {
  component: AdminWeeklyReport,
  subject: 'Collabor8 weekly report',
  displayName: 'Weekly report (founders)',
  previewData: {
    periodLabel: 'last 7 days',
    newUsers: 4,
    totalUsers: 21,
    activeUsers: 9,
    totalEvents: 143,
    linkedPairs: 6,
    paymentsCount: 3,
    paymentsTotal: 450,
    expensesCount: 2,
    tabs: [
      { name: 'home', clicks: 52, users: 9 },
      { name: 'maintenance', clicks: 31, users: 7 },
    ],
  },
} satisfies TemplateEntry
