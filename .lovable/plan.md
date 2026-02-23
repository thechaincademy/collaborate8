

## Co-Parent Role-Based Onboarding and Permissions

This plan introduces two distinct parent roles: a **managing parent** who controls the maintenance arrangement, and a **viewing parent** who can only view it. The managing parent invites the co-parent via an invite code sent by email.

### What Changes

**1. New Database Tables**

- **`profiles`** table: Stores user profile data including name, role (`managing` or `viewing`), and a link to their co-parent.
  - Columns: `id` (references auth user), `first_name`, `last_name`, `role` (managing/viewing), `coparent_id` (references another profile), `invite_code` (unique code generated for the managing parent), `created_at`, `updated_at`
  - A database trigger auto-creates a profile row on signup
  - RLS: Users can read/update their own profile; users can also read their co-parent's profile

- **`invitations`** table: Tracks invite codes sent by managing parents.
  - Columns: `id`, `inviter_id` (the managing parent), `invite_code` (6-character unique code), `invitee_email`, `status` (pending/accepted), `created_at`
  - RLS: Users can read/create their own invitations

**2. Updated Sign-Up Flow (Managing Parent)**

The existing sign-up page (`SignUp.tsx`) becomes the flow for the managing parent:
- Steps remain: Name, Email, Password, Co-parent email, Subscription, Verify
- After account creation, an invite code is generated and stored in the `invitations` table
- The co-parent step now explains that the co-parent will receive a code to create their account
- The verify step shows the generated invite code so they can share it

**3. New Sign-Up Flow (Invited/Viewing Parent)**

A new route `/signup/invited` with a page `SignUpInvited.tsx`:
- Step 1: Enter the invite code received from the managing parent
- Step 2: Enter name
- Step 3: Enter email and password
- Step 4: Subscription selection
- Step 5: Verify / Complete
- On completion, the invitation status is updated to "accepted", and both profiles are linked via `coparent_id`

**4. Updated Post-Signup Onboarding**

- **Managing parent** flow stays largely the same: connect bank, set payment amount, set frequency, complete
- **Viewing parent** flow: connect bank, then a "waiting" screen explaining the managing parent controls the arrangement

The `PostSignupOnboarding.tsx` will read the user's role from their profile to determine which flow to show (removing the "are you the paying parent?" question since the role is already determined by how they signed up).

**5. Maintenance Tab Changes (`MaintenanceTab.tsx`)**

- Fetch the current user's profile to check their role
- If role is `viewing`: hide the "View / Edit Arrangement" button entirely
- Show a subtle info message: "Your co-parent manages this arrangement"

**6. Edit Arrangement Page Changes (`EditRecurringPayment.tsx`)**

- Fetch the current user's profile to check their role
- If role is `viewing`: replace the entire edit form with a message:
  - "You don't have permission to edit this arrangement."
  - "If you'd like to change the maintenance arrangement, you would need to seek legal advice or apply to the court for a variation of the existing order."
  - A back button to return to the dashboard

**7. Login Page Update**

- Add a link/button on the login page: "Have an invite code? Sign up here" pointing to `/signup/invited`

### Technical Details

**Database migration SQL:**
```text
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'managing',
  coparent_id UUID REFERENCES public.profiles(id),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can read co-parent profile
CREATE POLICY "Users can read coparent profile"
  ON public.profiles FOR SELECT
  USING (id IN (
    SELECT coparent_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  invitee_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invitations"
  ON public.invitations FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Anyone can read invitation by code"
  ON public.invitations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update invitations"
  ON public.invitations FOR UPDATE
  USING (true);
```

**New files:**
- `src/pages/SignUpInvited.tsx` -- Invited parent sign-up flow
- `src/hooks/useProfile.tsx` -- Hook to fetch/update user profile and role

**Modified files:**
- `src/pages/SignUp.tsx` -- Generate invite code after signup, show it on verify step
- `src/pages/PostSignupOnboarding.tsx` -- Use profile role instead of asking; skip "paying parent" question
- `src/components/dashboard/MaintenanceTab.tsx` -- Check role, hide edit button for viewing parents
- `src/pages/EditRecurringPayment.tsx` -- Block editing for viewing parents with legal message
- `src/pages/Login.tsx` -- Add "Have an invite code?" link
- `src/App.tsx` -- Add `/signup/invited` route

