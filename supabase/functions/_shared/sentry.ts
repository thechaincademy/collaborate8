import * as Sentry from "npm:@sentry/deno@8.47.0";
import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  type SentryBreadcrumbLike,
  type SentryEventLike,
  sentrySendDefaultPii,
} from "../../../src/lib/sentryScrub.ts";

let started = false;

/** Starts Sentry on an edge function when SENTRY_DSN is set. No session replay on the server. */
export function initEdgeSentry() {
  if (started) return;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  started = true;
  Sentry.init({
    dsn,
    sendDefaultPii: sentrySendDefaultPii,
    beforeSend(event) {
      return scrubSentryEvent(event as SentryEventLike) as typeof event;
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb as SentryBreadcrumbLike) as typeof breadcrumb;
    },
  });
}

export function captureEdgeException(error: unknown) {
  initEdgeSentry();
  if (!started) return;
  Sentry.captureException(error);
}
