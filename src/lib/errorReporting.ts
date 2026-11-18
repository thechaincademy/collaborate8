import * as Sentry from "@sentry/react";
import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  type SentryBreadcrumbLike,
  type SentryEventLike,
  sentryReplayOnErrorSampleRate,
  sentryReplaySessionSampleRate,
  sentrySendDefaultPii,
} from "@/lib/sentryScrub";

let started = false;

/** Starts Sentry only when VITE_SENTRY_DSN is set. Session replay stays off. */
export function initErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || started || typeof window === "undefined") return;
  started = true;
  Sentry.init({
    dsn,
    sendDefaultPii: sentrySendDefaultPii,
    replaysSessionSampleRate: sentryReplaySessionSampleRate,
    replaysOnErrorSampleRate: sentryReplayOnErrorSampleRate,
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "Replay"),
    beforeSend(event) {
      return scrubSentryEvent(event as unknown as SentryEventLike) as unknown as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb as unknown as SentryBreadcrumbLike) as unknown as typeof breadcrumb;
    },
  });
}
