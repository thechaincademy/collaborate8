

## Landing Page Updates

### 1. Add "What You Get" Subscription Value Section
A new section will be added between the existing "Features" section and the "Finance phone" section. It will use a visually distinct design (e.g. a highlighted background) with:

- **Headline**: "Your subscription, packed with value"
- **Three value propositions** displayed as cards/list items:
  - **Unlimited expenses and payments** -- Track every payment and expense with no limits
  - **Micro-courses and budgeting tools** -- Access co-parenting mini-courses and downloadable budgeting templates
  - **Hundreds of pounds in rewards per year** -- Earn rewards and points for consistent payments, far exceeding the subscription cost
- A closing line reinforcing the gamification angle, e.g. "Stay consistent, earn points, and watch your rewards grow."
- A CTA button scrolling to the waitlist

### 2. Enhance Gamification Messaging
- Update the existing **Rewards** feature card description from "Earn rewards for consistent, on time payments." to something more compelling like: "Earn rewards and points for consistent payments. Unlock milestones, climb leaderboards, and save hundreds of pounds a year."
- The new subscription section (above) will also reinforce gamification with language about points, streaks, and rewards.

### 3. Remove Prototype Access
- Remove the "Try the Prototype" button and surrounding copy from the post-waitlist-signup success state (lines 304-316)
- Replace with a simple confirmation message (e.g. "We'll be in touch soon!")
- The `/splash` route and other prototype pages remain in the codebase but are no longer linked from the landing page

### Technical Details

**File changed:** `src/pages/Landing.tsx`

**Changes:**
1. Add new icons to imports: `Trophy`, `Star`, `BookOpen`, `Infinity` from lucide-react
2. Insert a new `<section>` block after the Features grid (after line 227) containing the subscription value cards
3. Update the Rewards feature description (line 90) with enhanced gamification copy
4. Replace the post-signup prototype link block (lines 304-316) with a simple confirmation without any link to `/splash`
