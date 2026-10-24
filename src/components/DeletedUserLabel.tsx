import { DELETED_USER_NAME } from "@/lib/profileDisplay";

/** Same small, muted name label used for earlier Chat messages. No initials or avatar. */
export default function DeletedUserLabel() {
  return <p className="mb-0.5 text-xs text-muted-foreground">{DELETED_USER_NAME}</p>;
}