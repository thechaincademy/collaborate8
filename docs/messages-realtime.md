# Messages read view and realtime contract

Current app builds may still `select` from `public.messages` and listen to the `messages` realtime publication. That path stays until the cutover file is applied by hand:

`supabase/manual/APPLY_AFTER_APP_BUILD_messages_realtime_cutover.sql`

Jian's build should use only the names below.

## Read view

Name: `public.messages_caller`

The caller must be signed in. The view returns only rows where `sender_id` or `recipient_id` is `auth.uid()`.

Columns:

| Column | Rule |
| --- | --- |
| `id` | uuid |
| `sender_id` | uuid |
| `recipient_id` | uuid |
| `body` | text |
| `created_at` | timestamptz |
| `attachment_path` | text, null if none |
| `attachment_name` | text, null if none |
| `used_suggestion` | boolean |
| `pending_first_message_id` | uuid, null if none |
| `original_body` | the sender's draft. Null for the receiver. |
| `tone_score` | the sender's score. Null for the receiver. |
| `read_at` | set only for the receiver. Null for the sender. |

Do not select `read_at`, `original_body`, or `tone_score` from `public.messages`.

## Realtime

Topic: `sg-family:{parent_low}:{parent_high}`

`parent_low` and `parent_high` are the two parents' user ids as lowercase uuid text, ordered so `parent_low <= parent_high`. A parent with no co-parent uses their own id for both.

Event name: `message`

The channel is private.

Payload fields (no `read_at`, `original_body`, or `tone_score`):

- `id`
- `sender_id`
- `recipient_id`
- `body`
- `created_at`
- `attachment_path`
- `attachment_name`
- `used_suggestion`
- `pending_first_message_id`
- `op` (`INSERT` or `UPDATE`)

## How the app authorises the channel

```ts
const { data } = await supabase.auth.getSession();
await supabase.realtime.setAuth(data.session.access_token);
const channel = supabase.channel(`sg-family:${parentLow}:${parentHigh}`, {
  config: { private: true },
});
channel.on("broadcast", { event: "message" }, (payload) => {
  // payload.payload is the object above
});
await channel.subscribe();
```

Postgres allows the select on `realtime.messages` only when `extension = 'broadcast'`, the topic starts with `sg-family`, and `auth.uid()` is one of the two ids in the topic.
