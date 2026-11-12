# PunjabSkillUp

PunjabSkillUp is a mobile-first course platform with an AI study partner in
every course. It uses Next.js, Supabase Auth/Postgres, pgvector, and Gemini.

## Local development

1. Install Node.js 20 or later and run `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase, service-role, and
   Gemini values described below.
3. Apply all migrations in `supabase/migrations/` using the Supabase CLI
   (`supabase db push`) or the SQL Editor.
4. Configure Google OAuth as described below.
5. To test instructor tools and sample courses, sign in once, promote your
   profile to instructor in the Supabase SQL Editor, then run `supabase/seed.sql`:

   ```sql
   update public.profiles
   set role = 'instructor'
   where id = '<your-auth-user-id>';
   ```

   The seed script creates two free courses and sample YouTube lectures under
   the first instructor/admin profile. Enroll your learner account in a free
   course before testing lecture AI. Sign out and back in if the dashboard
   still shows a stale session.
6. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Course data

The `courses`, `lectures`, and `enrollments` tables are created by
`supabase/migrations/20261112010000_create_courses_and_enrollments.sql`.
RLS restricts published course and lecture reads to signed-in users, course
editing to the owning instructor/admin, and enrollment reads to each user.
Published free courses use self-enrollment. Published paid courses use Razorpay
checkout; a verified, captured payment enrolls the buyer.

Signed-in learners can use the dashboard and course overviews. Enrolled learners
can watch lectures. Free lectures may use YouTube or Bunny Stream; paid lectures
must use Bunny Stream. Instructor/admin profiles can create and publish courses
at `/instructor`.

## Payments and protected video

The `20261112030000_add_payments_and_bunny_stream.sql` migration adds a private
payment ledger, an atomic payment-to-enrollment function, and Bunny Stream as a
lecture provider. It must be applied after the course migration. The ledger has
RLS enabled and no client access. Only the server verifies Razorpay checkout
signatures and webhook HMACs; it confirms the captured payment amount and INR
currency before the database function grants enrollment. Configure the
`payment.captured` Razorpay webhook to:

```text
https://<your-domain>/api/payments/webhook
```

Set its webhook secret independently from the Razorpay API secret. In the
Razorpay dashboard, enable automatic capture (or keep capture API access
enabled); the checkout verification route attempts to capture authorized
payments. Use Razorpay test credentials before switching to live mode.

Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` to the same public key
ID, and set `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` only on the
server. For Bunny Stream, set `BUNNY_STREAM_LIBRARY_ID` and the library's token
authentication key in `BUNNY_STREAM_TOKEN_AUTH_KEY`; the latter must remain a
server secret. The playback API returns an enrollment-gated iframe URL signed
for one hour and marks the response no-store.

When adding lectures, paste a Bunny Stream video UUID or its
`iframe.mediadelivery.net/embed/...` URL. Paid course lectures are required to
use Bunny Stream by the database trigger. If migrating an existing course,
first move its source videos into Bunny Stream and update each lecture's
`video_provider` and `video_ref`; existing paid YouTube lectures are blocked
from playback until migrated. Free courses can continue using YouTube.

## Lecture AI

The `20261112020000_create_lecture_ai.sql` migration enables pgvector and adds
transcript, 768-dimensional embedding, AI cache, and daily request-counter
tables. Apply it after the profile and course migrations. AI endpoints verify
the signed-in user is enrolled before accessing transcript or model data.
Transcript and cache reads are enrollment-scoped by RLS; writes and the atomic
30-requests-per-user-per-day counter are restricted to server-side service-role
functions.

On an enrolled lecture, use the Summary, Ask, or Quiz tab. When there is no
transcript yet, paste transcript text or upload a `.txt` file in the AI panel.
Embeddings and summaries/quizzes use Gemini; ask answers stream and cite the
retrieved lecture excerpts. Automatic audio transcription is not implemented
yet; the route contains a marked adapter TODO.

Get a Gemini API key from Google AI Studio and set it alongside your Supabase
project URL and keys in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

`SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server secrets. Never prefix
them with `NEXT_PUBLIC_` or expose them in browser code.

## Setup Google OAuth in Supabase

### Google Cloud Console

1. Create or select a Google Cloud project.
2. Under **APIs & Services → OAuth consent screen**, configure the app name,
   support email, audience, and required contact details. Add test users if the
   app is in testing mode.
3. Under **APIs & Services → Credentials**, create an **OAuth client ID** of
   type **Web application**.
4. Add your local application URL (`http://localhost:3000`) as an authorized
   JavaScript origin.
5. Add the Supabase callback URL shown on the Supabase Google provider page as
   an authorized redirect URI. It has the form
   `https://<project-ref>.supabase.co/auth/v1/callback`.
6. Copy the Google client ID and client secret.

### Supabase Dashboard

1. Open **Authentication → Providers → Google** and enable Google.
2. Paste the Google client ID and client secret, then save.
3. Open **Authentication → URL Configuration**. Set the site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the
   redirect URL allow list. Add your production URLs before deployment.
4. **Project Settings → API:** copy the project URL, anon/publishable key, and
   service-role key into `.env.local`. Get `GEMINI_API_KEY` from Google AI
   Studio. Keep both server keys private.
5. Apply all migrations in `supabase/migrations/` in filename order. They create
   profiles, course tables, pgvector transcript storage, and RLS policies.

The Supabase anon/publishable key is intended for browser use. Do not expose a
service-role key, Gemini API key, or Google client secret in frontend code or
`NEXT_PUBLIC_*` variables.
