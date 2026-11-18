import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  type SentryBreadcrumbLike,
  type SentryEventLike,
  sentrySendDefaultPii,
} from "./sentry-scrub.ts";
import { cfg } from "./config.ts";

let started = false;
let client: { captureException: (error: unknown) => void } | null = null;

/** Loads @sentry/deno only when SENTRY_DSN is set. */
export async function initEdgeSentry() {
  if (started) return;
  const dsn = cfg("SENTRY_DSN");
  if (!dsn) return;
  started = true;
  const Sentry = await import("npm:@sentry/deno@8.47.0");
  Sentry.init({
    dsn,
    sendDefaultPii: sentrySendDefaultPii,
    beforeSend(event) {
      return scrubSentryEvent(event as unknown as SentryEventLike) as unknown as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb as unknown as SentryBreadcrumbLike) as unknown as typeof breadcrumb;
    },
  });
  client = Sentry;
}

export function captureEdgeException(error: unknown) {
  void initEdgeSentry().then(() => client?.captureException(error));
}
