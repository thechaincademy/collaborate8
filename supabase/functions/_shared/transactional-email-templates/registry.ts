import type { ComponentType } from 'npm:react@18.3.1'
import { template as coparentInviteTemplate } from './coparent-invite.tsx'
import { template as userWelcomeTemplate } from './user-welcome.tsx'
import { template as newSignupAdminAlertTemplate } from './new-signup-admin-alert.tsx'


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
  'user_welcome': userWelcomeTemplate,
  'new_signup_admin_alert': newSignupAdminAlertTemplate,
}
