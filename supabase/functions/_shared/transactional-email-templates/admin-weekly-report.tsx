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

interface WeekRow {
  label?: string
  real?: number
  confirmed?: number
  isPartial?: boolean
}

interface AdminWeeklyReportProps {
  periodLabel?: string
  newUsers?: number
  newUsersConfirmed?: number
  newUsersLabel?: string
  weekSoFar?: { label?: string; real?: number; confirmed?: number }
  totalUsers?: number
  totalUsersConfirmed?: number
  weekly?: WeekRow[]
  excluded?: Record<string, number>
  activityLabel?: string
  activeUsers?: number
  totalEvents?: number
  linkedPairs?: number
  linkedPairsLabel?: string
  paymentsCount?: number
  paymentsTotal?: number
  expensesCount?: number
  tabs?: TabRow[]
  dashboardUrl?: string
  subjectPrefix?: string
}

const row = { margin: '0 0 6px', color: '#444444', fontSize: '14px' }
const cell = { padding: '4px 8px 4px 0', fontSize: '13px', color: '#444444', textAlign: 'left' as const }

export const AdminWeeklyReport = ({
  periodLabel = 'last 7 days',
  newUsers = 0,
  newUsersConfirmed,
  newUsersLabel = 'last 7 days',
  weekSoFar,
  totalUsers = 0,
  totalUsersConfirmed,
  weekly = [],
  activityLabel,
  activeUsers = 0,
  totalEvents = 0,
  linkedPairs = 0,
  linkedPairsLabel = 'Linked co-parents (real parents)',
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

        <Text style={row}>
          <strong>New real parent sign-ups - {newUsersLabel}:</strong> {newUsers} · {newUsersConfirmed ?? newUsers} confirmed
        </Text>
        {weekSoFar && (
          <Text style={row}>
            <strong>{weekSoFar.label ?? 'This week (so far)'}:</strong> {weekSoFar.real ?? 0} · {weekSoFar.confirmed ?? 0} confirmed
          </Text>
        )}
        <Text style={row}>
          <strong>Total real parents:</strong> {totalUsers} · {totalUsersConfirmed ?? totalUsers} confirmed
        </Text>

        {weekly.length > 0 && (
          <table style={{ borderCollapse: 'collapse', margin: '8px 0 6px' }}>
            <thead>
              <tr>
                <th style={cell}>Week</th>
                <th style={cell}>Real</th>
                <th style={cell}>Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w, i) => (
                <tr key={`${w.label}-${i}`}>
                  <td style={cell}>{w.label}</td>
                  <td style={cell}>{w.real ?? 0}</td>
                  <td style={cell}>{w.confirmed ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Text style={{ ...row, fontSize: '12px', color: '#777777', marginBottom: '16px' }}>
          Excludes test/QA and agent inboxes, team accounts, disposable and invalid emails.
        </Text>

        {activityLabel && (
          <Text style={{ ...row, fontSize: '12px', color: '#777777' }}>{activityLabel}</Text>
        )}
        <Text style={row}><strong>Active users:</strong> {activeUsers}</Text>
        <Text style={row}><strong>{linkedPairsLabel}:</strong> {linkedPairs}</Text>
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
  subject: (data: Record<string, any>) => {
    const prefix = typeof data?.subjectPrefix === 'string' ? data.subjectPrefix.trim() : ''
    return prefix ? `${prefix}: Collabor8 weekly report` : 'Collabor8 weekly report'
  },
  displayName: 'Weekly report (founders)',
  previewData: {
    periodLabel: 'Week ending 30 Oct 2026',
    newUsers: 4,
    newUsersConfirmed: 3,
    newUsersLabel: 'Last 7 full days',
    weekSoFar: { label: 'This week (so far)', real: 2, confirmed: 1 },
    totalUsers: 21,
    totalUsersConfirmed: 18,
    weekly: [
      { label: 'Mon 19 Oct', real: 3, confirmed: 3 },
      { label: 'Mon 26 Oct (so far)', real: 2, confirmed: 1, isPartial: true },
    ],
    activityLabel: 'Last 7 days (rolling, to 30 Oct 2026, 09:00 UK)',
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
