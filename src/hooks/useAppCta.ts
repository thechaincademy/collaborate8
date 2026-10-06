import { useAuth } from "@/hooks/useAuth";

/**
 * Target for a public-page call to action.
 *
 * Signed-in parents go straight into the app; everyone else keeps the
 * sign-in/sign-up page the button originally pointed at.
 */
export const useAppCtaHref = (signedOutHref = "/splash") => {
  const { user } = useAuth();
  return user ? "/dashboard" : signedOutHref;
};
