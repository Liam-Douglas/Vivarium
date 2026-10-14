# Getting Vivarium into the iOS App Store

## Status, 14 October 2026

Planned. Nothing here has started. Every finding below was read from the code on
`main` at `109e577`. The guideline numbers and Apple requirements were checked
against Apple's published pages on the same day.

## The short version

Vivarium is a good candidate. It is a real account-based app: records, charts,
household sync, 269 passing tests, RLS checked in CI. It already handles the
notch with `env(safe-area-inset-*)` and has a responsive layout. What it is not
is a native binary, and the App Store only takes those.

The route is **Capacitor 8**. It wraps the existing Vite build and **bundles it
inside the app**, rather than pointing a web view at the Vercel URL. Loading the
live site is what reads as "a repackaged website" under guideline 4.2. Capacitor
then supplies native plugins for the few browser APIs an iOS web view lacks.
There is no rewrite.

The wrapper is the smaller part of the work. The larger part is thirteen findings
below: five would get the app rejected, and eight break once it runs inside a
native shell. Several of the fixes belong to the web app and help PWA users too.
They can start before Apple is involved at all.

## What stands in the way

### Would be rejected

| # | Guideline | Finding | Where |
|---|---|---|---|
| R1 | 5.1.1(v), account deletion | There is no way to delete an account in the app. Settings offers *Leave collection* and *Sign out*; the Privacy Policy says to email a request. Apple requires deletion inside the app for any app that lets people create an account. | `pages/Settings.tsx`; `pages/Privacy.tsx`, "Data retention and deletion" |
| R2 | 4.8, login services | *Continue with Google* is offered with no privacy-preserving equivalent beside it. Sign in with Apple satisfies the rule. | `pages/auth/SignIn.tsx:48`, `pages/auth/SignUp.tsx:55` |
| R3 | 2.1(a), completeness | The free plan stops at five animals, and the upgrade screen says *Pro plan — coming soon*. The reviewer will add animals, reach that limit, and find nothing to buy. Separately, the waitlist form keeps no email: `handleSubmit` only flips local state. It still tells the person "We'll email you", and the Privacy Policy lists the waitlist as a use of their data. | `components/upgrade/UpgradeModal.tsx:15` |
| R4 | 5.1.1(i), privacy policy | `/terms` and `/privacy` sit inside `RequireAuth` (`App.tsx:102–103`, under the `/*` route at `:143`), so a signed-out visitor is sent to sign-in. App Store Connect needs a privacy policy URL anyone can open. The *Terms* and *Privacy Policy* links on the sign-up screen hit the same redirect today. The policy is also out of date. It is dated April 2025 and says nothing about photos, the receipt-scanning processor, hCaptcha, Google or Apple sign-in, or deleting your account in the app. | `App.tsx`, `pages/Privacy.tsx` |
| R5 | 5.1.2(i), third-party AI | Receipt scanning uploads a photo of the receipt to a `parse-receipt` edge function. That function is not in this repository. If it calls an AI provider, the app must say so and get explicit permission before the first upload. A line in the policy is not enough. | `pages/Expenses.tsx:351` |

### Breaks inside the native shell

| # | Finding | Where | Fix |
|---|---|---|---|
| N1 | Google refuses OAuth inside an embedded web view (`disallowed_useragent`). `redirectTo` is also `window.location.origin`, which inside the app is `capacitor://localhost`. | `SignIn.tsx:52`, `SignUp.tsx:59` | Open the OAuth URL in the system browser sheet (`@capacitor/browser`, with `skipBrowserRedirect`). Return through a custom URL scheme and call `exchangeCodeForSession`. For Apple, use the native sheet through a Capacitor plugin, then `signInWithIdToken`. |
| N2 | Password reset sets `redirectTo` to the same origin. The link opens in Safari, but the PKCE verifier lives in the app's web view, so the reset cannot complete. A sign-up confirmation does confirm the account, but it leaves the person on the website rather than in the app. | `ForgotPassword.tsx:32`, `SignUp.tsx` | Switch both flows to 6-digit email codes (`verifyOtp`). These work the same on web and native and need no domain wiring. The alternative is Universal Links. |
| N3 | `WKWebView` has no `Notification` API. Settings would say "This browser doesn't support notifications", and overdue reminders would stop. | `hooks/useOverdueNotification.ts` | `@capacitor/local-notifications`, scheduled at each animal's due time and rescheduled when a feeding is logged or the app resumes. This is better than today, because it fires while the app is closed. |
| N4 | *Export collection* (`writeFile`) and the import template (`a.download`) are browser downloads. Inside a web view they don't save anywhere. | `pages/Settings.tsx:246`, `pages/Import.tsx:164` | Generate with `XLSX.write`, save with `@capacitor/filesystem`, then open the share sheet. |
| N5 | An animal's QR code encodes `window.location.origin/animals/:id`, which inside the app becomes `capacitor://localhost/…`. | `pages/AnimalDetail.tsx:209` | Read a public base URL from env. |
| N6 | hCaptcha protects sign-in, sign-up and reset, and its widget rejects `localhost` hostnames by default. The app's origin is `capacitor://localhost`. Supabase enforces the captcha on the endpoints, so it cannot be switched off for the app alone. | auth pages | Set Capacitor's `server.hostname` to a domain registered on the sitekey. **Prove this on a device in the first spike**, because it is the finding most likely to need a second approach. |
| N7 | The service worker and Workbox cache do not run under `capacitor://`. The app updates through the App Store instead. | `vite.config.ts` | Add a `native` build mode that leaves VitePWA out. |
| N8 | The app icon is 512 px with transparent rounded corners. The App Store wants 1024 × 1024, square, with no alpha, and iOS applies its own mask. `favicon.svg` is still the stock Vite logo. | `public/icon-512.png`, `public/favicon.svg` | Make one full-bleed 1024 master and generate everything from it. |

### Harmless until Pro costs money

- **`profiles.tier` can be written by its owner.** `profiles_update_self`
  (`0001_rls_policies.sql:211`) has no column guard, and nothing else protects
  `tier`. Any signed-in user can make themselves Pro through the API.
- **The five-animal limit is enforced only in the client**, at `Animals.tsx:140`
  and `Dashboard.tsx:362`. No policy or trigger backs it up.
- **Tier is per person, but the limit is per household.** Nothing decides yet
  whose purchase lifts the limit for a shared collection.

All three have to be settled before in-app purchase ships. None of them matters
while Pro is free.

### The name

**"Vivarium: Exotic Pet Tracker" is already on the App Store**, from another
developer (Lucas Bertaud Gonzalez): Lifestyle category, published 2026. It does
the same job (feedings, weights, sheds, vet visits, breeding) and has the same
five-animal free tier. Apple only requires the full name string to be unique, so
"Vivarium" on its own may still be available. Even so, a same-named app doing the
same job in the same category invites a name dispute under 5.2 and splits search
results. Settle the store name before creating the App Store Connect record. The
display name can change later; the bundle ID cannot.

## Decisions to take first

| | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Pro at launch | **Ship v1 free with no limit, and remove the upgrade screen.** Add in-app purchase in v1.1. | Clears R3. Keeps the first review away from paywall rules (restore purchases, subscription terms, pricing disclosure). Defers the `tier` and limit server work until there is money to protect. |
| D2 | Developer account | **Individual**, unless a company already exists | An organisation account needs a legal entity and a D-U-N-S number, and takes longer to approve. The seller name shown on the store is the account holder's. |
| D3 | Store name and bundle ID | Your call; see *The name* above | The bundle ID is permanent once the app record exists. |
| D4 | Devices | **iPhone only for v1** | iPad needs a second screenshot set and review on iPad. It also needs the portrait lock in the manifest reconciled with iPad multitasking. The layout is already responsive, so iPad is a cheap v1.1. |
| D5 | Email flows | **6-digit codes** | Fixes N2 on both platforms with no Universal Links setup. |
| D6 | Build machine | **A Mac with Xcode 26** for setup and device testing; add CI later | Since 28 April 2026, uploads must be built with Xcode 26 against the iOS 26 SDK. iOS apps cannot be built on Linux. CI options: Xcode Cloud (25 compute hours a month come with the membership), or a GitHub Actions macOS runner (minutes count at 10× on private repos). |

## Phases

Phase 0 runs alongside Phase 1, because enrollment can take days and other steps
depend on it. The critical path is: enrollment → Sign in with Apple
configuration → native auth → TestFlight → submission.

| | Phase | Size | Depends on |
|---|---|---|---|
| 0 | Apple admin | — | D2, D3 |
| 1 | Fix the web app | M | D1, D5; Phase 0 for Sign in with Apple |
| 2 | Capacitor shell | M | Phase 1 auth changes |
| 3 | Native replacements | M | Phase 2 |
| 4 | TestFlight | S | Phase 3, D6 |
| 5 | Listing and submission | S | Phase 4 |
| 6 | After launch | L | — |

### Phase 0 — Apple admin

- Enrol in the Apple Developer Program: US$99 a year, A$149 in Australia.
- Register the App ID with the Sign in with Apple capability. Create the
  Services ID and key that Supabase's Apple provider needs for the web flow.
- Register the auth email sending domain under Sign in with Apple's email
  communication settings. Without it, confirmation and reset emails to
  *Hide My Email* relay addresses are dropped.
- Create the App Store Connect record: name (D3), bundle ID, SKU, primary
  language English (Australia).
- Make sure `support@vivarium.app` and `privacy@vivarium.app`, named in the legal
  pages, are real mailboxes, or change them. App Review uses the support details,
  and the domain couldn't be checked from this environment.
- Declare EU trader status under the DSA, or leave EU storefronts out of v1.

### Phase 1 — Fix the web app

Every item here ships to the PWA too.

1. **Account deletion (R1).** This needs an edge function running with the
   service role, because deleting from `auth.users` requires it. Households need
   rules:
   - The **sole owner** of a household with other active members must hand
     ownership over first. Block deletion with a message until they do.
   - The **only member** of a household deletes it along with its rows and
     everything under `animal-photos/<household_id>/`.
   - A person who signed in with Apple has their token revoked through Apple's
     REST API, which Apple requires.

   Add a type-to-confirm dialog in Settings. Add a test that proves deletion
   leaves no rows or objects behind; the negative RLS fixture is the natural
   place for it.
2. **Public legal pages (R4).** Move `/terms` and `/privacy` out of
   `RequireAuth`. Rewrite the policy to name the processors (Supabase, hCaptcha,
   Google, Apple, whoever `parse-receipt` calls). It should also say that
   photos have their EXIF data stripped (`lib/image.ts`), and that accounts can
   be deleted in the app.
3. **The Pro gate (R3)** per D1. Remove the limit and `UpgradeModal`. If the
   limit stays instead, the waitlist has to actually store the email.
4. **Receipt consent (R5).** First confirm what `parse-receipt` calls. If it is
   an AI provider, show a one-time sheet before the first upload. It names the
   provider and says what is sent. Record the answer on the profile rather than
   in `localStorage`, so it holds across devices.
5. **Sign in with Apple** on web, through Supabase's Apple provider. This
   needs the Services ID from Phase 0.
6. **Email codes (D5)** for sign-up confirmation and password reset.
7. **A public base URL** for the QR code (N5).

### Phase 2 — Capacitor shell

- Install `@capacitor/core`, `@capacitor/cli` and `@capacitor/ios`, then run
  `cap init` and `cap add ios`. Capacitor 8 uses Swift Package Manager, targets
  iOS 15 or later, and needs Xcode 26.
- In `capacitor.config.ts`, set `appId`, `appName`, `webDir: 'dist'`, and the
  `server.hostname` that N6 settles.
- Run `vite build --mode native` without VitePWA (N7). Bundle the two Google
  Fonts locally (`@fontsource`), so the first launch without a connection
  doesn't fall back to system fonts.
- Add `src/lib/platform.ts` exporting `isNative()`. Every web/native branch goes
  through it, so the web build stays unchanged.
- **Native auth (N1).** Use a Sign in with Apple plugin, then
  `signInWithIdToken({ provider: 'apple' })`, and save the name Apple returns on
  the first sign-in to `profiles.full_name`, because Apple never sends it again.
  Google goes through the browser sheet, returns on a `vivarium://` scheme, then
  calls `exchangeCodeForSession`.
- **Session storage.** Give the Supabase client a `@capacitor/preferences`
  storage adapter. Capacitor advises against relying on web view `localStorage`
  for anything that must persist, because iOS can reclaim it.
- Status bar with light content on `#1a1a18`, a splash screen, keyboard resize
  behaviour (check every modal), and icons from the new 1024 master (N8).
- **Info.plist.** Add `NSCameraUsageDescription`: the photo inputs offer *Take
  Photo*, and the app crashes there without this key. Set
  `ITSAppUsesNonExemptEncryption` to `NO`, since the app uses HTTPS only.
- **Privacy manifest.** Add `PrivacyInfo.xcprivacy` declaring the
  required-reason APIs: UserDefaults, through Preferences.

### Phase 3 — Native replacements

- **Local notifications for feeding due times (N3).** This is the clearest
  "this is an app" feature, and it is more useful than what the PWA does now.
- **Share-sheet export and import template (N4).** Importing from Files already
  works through the file input.
- **Optional:** haptics on the log actions, and a home-screen quick action for
  *Log feeding*.

On guideline 4.2: Vivarium does not risk that rule for being thin. Accounts,
records, charts and household sync make it substantive. The risk is looking like
a website in a frame, so the work above is about behaving natively: bundled
assets, native sign-in, the share sheet, and notifications that fire while the
app is closed.

### Phase 4 — TestFlight

Archive in Xcode and upload. Later, use fastlane with an App Store Connect API
key in CI. Test on a physical iPhone, not only the simulator. The camera, push
permission and Apple sign-in all behave differently on a real device.

Device test list:

- Sign up with an email code, including the hCaptcha (N6)
- Sign in with a password, with Google, and with Apple, including *Hide My Email*
- Reset a password with a code
- Join a household by invite code, then approve the join request
- Add an animal using both the camera and the photo library, and check that
  signed URLs render
- Log a feeding, check that the feeder stock goes down, and check that the
  reminder is rescheduled
- Scan a receipt, including the consent sheet
- Export to the share sheet, then import an `.xlsx` from Files
- Open an animal's QR code
- Delete an account: as an owner with members (blocked), as the only member,
  and as a member
- Airplane mode, to check that error states read correctly
- The notch and Dynamic Island, the keyboard over every modal, and an iPhone SE
  screen

### Phase 5 — Listing and submission

- **Screenshots** at 6.9" (1320 × 2868), between three and ten.
  `npm run render` already draws the dashboard, animal profile, feeding and
  shopping-list scenarios from fixtures. A 440 × 956 viewport at 3× scale gives
  exactly that size from the same fixtures.
- **Metadata:** subtitle (30 characters), description, keywords (100
  characters), category (Lifestyle, with Productivity second), support URL,
  public privacy policy URL (R4), copyright.
- **App Privacy label.** See the draft below.
- **Age rating questionnaire.** The content is likely to rate at the lowest
  tier. The Terms set 13 as the minimum age, so decide whether the store rating
  should match.
- **Review notes and a demo account.** Use a reviewer login with a seeded
  household of eight to ten animals. Give them feeding, weight and shed history,
  a medication schedule and an incubation in progress, so every screen has
  something on it. Explain what invite codes are for, and mention the captcha.
- Submit.

### Phase 6 — After launch

- **In-app purchase for Pro** (StoreKit 2, likely through RevenueCat). This
  needs:
  - `tier` locked against client writes
  - the animal limit enforced on the server
  - entitlements set from App Store Server Notifications
  - a decision on whether Pro belongs to a person or to a household
  - the Paid Apps agreement, plus tax and banking details
- Server push through APNs, so reminders account for feedings logged by other
  household members.
- Home-screen widgets (WidgetKit, in Swift).
- iPad.

## App Privacy label, draft

Nothing is used for tracking, so the app needs no App Tracking Transparency
prompt. All of the data below is linked to the user and used for app
functionality.

| Category | Types | Notes |
|---|---|---|
| Contact info | Email address, name | Account and household display |
| User content | Photos, other user content | Animal photos, records, notes, receipt images |
| Identifiers | User ID | Supabase auth ID |
| Diagnostics | Confirm | The policy promises "error traces". No crash or error reporter appears in `package.json`, so check whether anything is actually collected. |
| Other | Per hCaptcha's guidance | hCaptcha collects device and interaction signals to prevent fraud |
| Purchases | None in v1 | Added with in-app purchase |

The label must also cover what `parse-receipt`'s provider receives.

## Sources

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): 2.1(a), 3.1.1, 4.2, 4.8, 5.1.1, 5.1.2(i)
- [Apple SDK minimum requirements](https://developer.apple.com/news/upcoming-requirements/): Xcode 26 and the iOS 26 SDK from 28 April 2026
- [Announcing Capacitor 8](https://ionic.io/blog/announcing-capacitor-8), and [Capawesome's upgrade guide](https://capawesome.io/blog/how-to-upgrade-your-capacitor-app-to-capacitor-8/): SPM by default, iOS 15, Xcode 26
- [Vivarium: Exotic Pet Tracker on the App Store](https://apps.apple.com/us/app/vivarium-exotic-pet-tracker/id6765792488)
