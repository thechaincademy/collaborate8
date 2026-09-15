import type { ComponentType } from 'npm:react@18.3.1'
import { template as coparentInviteTemplate } from './coparent-invite.tsx'
import { template as conversationToolInviteTemplate } from './conversation-tool-invite.tsx'
import { template as userWelcomeTemplate } from './user-welcome.tsx'
import { template as newSignupAdminAlertTemplate } from './new-signup-admin-alert.tsx'
import { template as adminWeeklyReportTemplate } from './admin-weekly-report.tsx'
import { template as productUpdateTemplate } from './product-update.tsx'
import { template as conversationSummaryTemplate } from './conversation-summary.tsx'
import { template as firstMessageNoticeTemplate } from './first-message-notice.tsx'
import { template as manualPaymentReminderTemplate } from './manual-payment-reminder.tsx'


export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'coparent_invite': coparentInviteTemplate,
  'conversation_tool_invite': conversationToolInviteTemplate,
  'user_welcome': userWelcomeTemplate,
  'new_signup_admin_alert': newSignupAdminAlertTemplate,
  'admin_weekly_report': adminWeeklyReportTemplate,
  'product_update': productUpdateTemplate,
  'conversation_summary': conversationSummaryTemplate,
  'first_message_notice': firstMessageNoticeTemplate,
  'manual_payment_reminder': manualPaymentReminderTemplate,
}
