// Deploy target: supabase/functions/_shared/transactional-email-templates/founder-signature.tsx
import * as React from 'npm:react@18.3.1'

// Email-safe founder signature: tables, inline styles, Arial, no images, no <style> tag.
// The two cards are fluid inline-block columns: side by side on wide screens,
// stacked automatically on narrow ones (no media query needed).

const NAVY = '#1B4A6B'
const font = 'Arial, Helvetica, sans-serif'

interface Row {
  glyph: string
  text: string
  href?: string
}

const Icon = ({ glyph }: { glyph: string }) => (
  <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
    <tbody>
      <tr>
        <td
          width={18}
          height={18}
          align="center"
          valign="middle"
          style={{ width: '18px', height: '18px', backgroundColor: NAVY, borderRadius: '9px', color: '#ffffff', fontSize: '10px', lineHeight: '18px', fontFamily: font, textAlign: 'center' }}
        >
          {glyph}
        </td>
      </tr>
    </tbody>
  </table>
)

const Card = ({ name, title, rows }: { name: string; title: string; rows: Row[] }) => (
  <div
    className="sigcol"
    style={{ display: 'inline-block', width: '100%', maxWidth: '290px', verticalAlign: 'top', margin: '0 0 16px' }}
  >
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td valign="top" style={{ paddingRight: '10px', fontFamily: font }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase', lineHeight: '28px' }}>{name}</div>
            <div style={{ fontSize: '13px', color: '#333333', margin: '2px 0 12px' }}>{title}</div>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.text}>
                    <td valign="middle" style={{ padding: '3px 8px 3px 0' }}>
                      <Icon glyph={r.glyph} />
                    </td>
                    <td valign="middle" style={{ padding: '3px 0', fontSize: '12px', color: '#333333', fontFamily: font }}>
                      {r.href ? (
                        <a href={r.href} style={{ color: '#333333', textDecoration: 'none' }}>{r.text}</a>
                      ) : (
                        r.text
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
          <td valign="top" width={64} style={{ width: '64px' }}>
            <div style={{ width: '64px', height: '150px', backgroundColor: NAVY, borderRadius: '0 0 32px 32px' }} />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)

const ADDRESS = '86-90 Paul Street, London, EC2A 4NE'
const WEB = { glyph: '\u25EF', text: 'www.collaborate8.com', href: 'https://www.collaborate8.com' }

export const FounderSignature = () => (
  <div style={{ marginTop: '24px' }}>
    <Card
      name="Rafaela A"
      title="Co-founder & CTO"
      rows={[
        WEB,
        { glyph: '\u2709', text: 'rafa@collaborate8.com', href: 'mailto:rafa@collaborate8.com' },
        { glyph: '\u26B2', text: ADDRESS },
      ]}
    />
    <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '12px', fontFamily: font, fontSize: '11px', lineHeight: '16px', color: '#8a8f98' }}>
      <p style={{ margin: '0 0 8px' }}>
        This email is confidential and meant only for the person it is addressed to. If you received it in error, please tell us by replying and then delete it. Collabor8 does not give legal or financial advice.
      </p>
      <p style={{ margin: 0 }}>Collaborate Technologies Ltd, 86-90 Paul Street, London EC2A 4NE</p>
    </div>
  </div>
)

export default FounderSignature
