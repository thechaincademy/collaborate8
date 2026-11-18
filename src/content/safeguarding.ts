/**
 * DRAFT safeguarding copy for founder approval.
 * Status: DRAFT. Do not treat this wording as final.
 * All user-facing safeguarding sentences live in this file.
 */

export const SAFEGUARDING_COPY_STATUS = "DRAFT" as const;

export const CMS_COLLECT_AND_PAY_URL = "https://www.gov.uk/child-maintenance-service/payments#collect-and-pay";
export const CMS_HOW_TO_APPLY_URL = "https://www.gov.uk/child-maintenance-service/how-to-apply";

export const SHARED_PAUSE_NOTICE =
  "Shared tools are paused for now while our team reviews your account. You can still view your records and download your PDF. We'll be in touch within one working day.";

export const suitabilityCopy = {
  title: "A few private questions",
  intro:
    "These questions are only for you and the Collabor8 safeguarding lead. Your co-parent cannot see your answers. There are no right or wrong answers.",
  reportExplainer:
    "If you are worried about a message, a payment, an expense, or something else in Collabor8, you can send a private note to the safeguarding lead. Your co-parent is not shown that you sent it, and they are not shown what you wrote. If shared tools need to pause, you both see the same short notice.",
  continue: "Save and continue",
  done: "Continue",
  saved: "Your answers have been saved.",
  unavailable: "This check is not available yet. You can continue.",
} as const;

export interface SuitabilityOptionCopy {
  key: "yes" | "no" | "unsure" | "prefer_not";
  label: string;
}

export interface SuitabilityQuestionCopy {
  key: "q1" | "q2" | "q3" | "q4" | "q5";
  prompt: string;
  options: readonly SuitabilityOptionCopy[];
}

export const SUITABILITY_QUESTIONS: readonly SuitabilityQuestionCopy[] = [
  {
    key: "q1",
    prompt: "Do you feel safe sharing arrangements with the other parent through an app?",
    options: [
      { key: "yes", label: "Yes" },
      { key: "unsure", label: "Not sure" },
      { key: "no", label: "No" },
    ],
  },
  {
    key: "q2",
    prompt: "Has the other parent ever made you feel afraid, threatened or controlled?",
    options: [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    key: "q3",
    prompt: "Is there a court order, injunction or undertaking that limits contact between you?",
    options: [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "unsure", label: "Not sure" },
    ],
  },
  {
    key: "q4",
    prompt: "Do you think the other parent might check your phone, accounts or location?",
    options: [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "unsure", label: "Not sure" },
    ],
  },
  {
    key: "q5",
    prompt: "Has money ever been held back or used to pressure you?",
    options: [
      { key: "yes", label: "Yes" },
      { key: "no", label: "No" },
      { key: "prefer_not", label: "Prefer not to say" },
    ],
  },
] as const;

export const cmsGuidanceCopy = {
  title: "Child Maintenance Service",
  body: "If you want child maintenance to be collected and passed on for you, you can apply to the Child Maintenance Service for Collect and Pay. Collabor8 does not collect or pass on these payments. The Child Maintenance Service runs Collect and Pay.",
  collectLink: "Collect and Pay on gov.uk",
  applyLink: "How to apply on gov.uk",
  record: "You can download a dated record of your messages and payments to keep for yourself.",
  download: "Download dated record",
} as const;

export const reportCopy = {
  title: "Raise a concern",
  button: "Raise a concern",
  intro:
    "Send a private note to the Collabor8 safeguarding lead. Your co-parent cannot read it. If shared tools pause, you both see the same short notice.",
  categoryLabel: "What is this about?",
  categories: [
    { key: "message", label: "A message" },
    { key: "payment", label: "A payment" },
    { key: "expense", label: "An expense" },
    { key: "general", label: "Something else" },
  ],
  targetLabel: "Record reference, if you have one (optional)",
  bodyLabel: "What would you like the safeguarding lead to know? (optional)",
  bodyPlaceholder: "Write in your own words.",
  submit: "Send privately",
  sent: "Your note has been sent.",
  reference: "Your reference is",
  unavailable: "This is not available yet.",
} as const;

export const quietModeCopy = {
  title: "Quiet mode",
  body: "Quiet mode pauses alerts for your account. Push alerts and non-essential emails stay off until you turn it off. Sign-in emails still send.",
  on: "Turn on quiet mode",
  off: "Turn off quiet mode",
  savedOn: "Quiet mode is on.",
  savedOff: "Quiet mode is off.",
} as const;

export const securityCheckCopy = {
  title: "Security check",
  offer: "Review devices and password",
  body: "This signs you out on every other device and asks you to choose a new password. This device stays signed in. It opens only when you choose it.",
  signOutOthers: "Sign out other devices",
  signedOut: "Other devices are signed out. Choose a new password.",
  passwordLabel: "New password",
  confirmLabel: "Confirm new password",
  update: "Update password",
  updated: "Your password has been updated.",
  mismatch: "Those passwords do not match.",
  weak: "Use at least 8 characters, with upper and lower case letters and a number.",
  failed: "Could not update the password. Please try again.",
} as const;

export const settingsCopy = {
  section: "Safeguarding",
  check: "Private questions",
  report: "Raise a concern",
  record: "Download dated record",
} as const;

export const dslCopy = {
  title: "Safeguarding review",
  intro: "DSL view for Rafa and Jade. Flags and concerns. Actions are written to the audit log without message text.",
  noAccess: "You do not have access to this page.",
  flags: "Paused families",
  concerns: "Concerns",
  emptyFlags: "No paused families.",
  emptyConcerns: "No concerns.",
  pause: "Pause shared tools",
  lift: "Lift pause",
  pair: "Parent pair",
} as const;

export const recordCopy = {
  heading: "Collabor8 record",
} as const;
