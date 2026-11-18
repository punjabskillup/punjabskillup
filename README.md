# PunjabSkillUp

PunjabSkillUp is a mobile-first course platform with an AI study partner in
every course. It uses Next.js, Supabase Auth/Postgres, pgvector, and Gemini.

## Local development

1. Install Node.js 20 or later and run `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase, service-role, and
   Gemini values described below.
3. Apply all migrations in `supabase/migrations/` using the Supabase CLI
   (`supabase db push`) or the SQL Editor.
4. Configure Google OAuth as described below. Google is the only sign-in
   provider used by the application.
5. Bootstrap the first admin once from the Supabase SQL Editor after creating
   the account:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'YOUR_EMAIL';
   ```

   Admin status is granted only with this trusted SQL step; the application
   provides no UI or API to grant it. Sign in with Google, then visit
   `/manage/courses`.
6. Run `supabase/seed.sql` after applying the migrations. It creates the
   published AI and ML course; if an instructor/admin profile exists, it also
   adds sample free courses and lectures.
7. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Course data

The `courses`, `lectures`, and `enrollments` tables are created by
`supabase/migrations/20261112010000_create_courses_and_enrollments.sql`.
`supabase/migrations/20261116000000_signed_in_catalog.sql` adds course slugs,
private thumbnail paths, notes, and lecture publication flags. Signed-in users
can read only published courses, notes, and lectures; client writes to those
catalog tables are disabled. The `/explore`, `/notes`, `/free-lectures`, and
`/courses/[slug]` pages require sign-in and are excluded from indexing.

Course thumbnails are stored in the private `course-thumbnails` bucket. The
server creates one-hour signed URLs for published course images. Free courses
use self-enrollment. Paid courses use Razorpay checkout; a verified, captured
payment enrolls the buyer. Admins can manage courses in the panel described
below. Instructors can add lectures and upload course notes from `/instructor`;
note editing and deletion are not included.

## Admin course management

Apply `supabase/migrations/20261116010000_admin_panel_security.sql` after the
catalog migration. The SQL Editor bootstrap above is the only supported way to
grant administrator identity. Admin pages and actions require a
Google-authenticated user whose ID is in `public.admin_users`.

Google is the only sign-in method used by the application. Set
`NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin used by the site (for example
`https://example.com`); local development can use `http://localhost:3000`.
In Supabase Authentication settings, enable Google and disable unused phone,
email/password, and MFA/TOTP methods. Existing users who only used phone or
email/password sign-in need their accounts migrated before those providers are
disabled.

The user's Google email is saved to `public.profiles`. During free or paid
course enrollment, learners enter their name and contact number; these are
saved to `profiles.full_name` and `profiles.contact_phone`. The number is not
SMS-verified. Apply
`supabase/migrations/20261117100000_collect_enrollment_email.sql` and
`supabase/migrations/20261118100000_collect_enrollment_phone.sql` before
deploying. Enable manual identity linking in Supabase Auth settings if required
to link Google to an existing account.

The hidden admin panel is not linked in the site navigation or sitemap.
`/manage/courses` supports creating, editing, publishing, and deleting courses.
Thumbnail uploads are limited to JPEG, PNG, or WebP files up to 3 MB, verified
by file signature, then cropped to 16:9 and re-encoded as WebP before storage.
Admin changes and thumbnail object changes are recorded in
`public.admin_audit_log`.

### Course notes

Apply `supabase/migrations/20261117000000_cloudflare_r2_notes.sql` after the
admin panel migration. Create a **private** Cloudflare R2 bucket and an R2 API
token limited to that bucket, then configure these server-only variables:

```dotenv
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<r2-access-key-id>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
CLOUDFLARE_R2_BUCKET=<private-bucket-name>
```

Instructors can upload PDF, DOC, or DOCX notes up to 20 MB to courses they own;
admins can upload to any course. Published free notes are available to signed-in
learners, while premium notes require enrollment in the associated course.
Uploads are stored privately in R2. Share the generated `/notes/<id>` link on
your website; file downloads are streamed through the website after access is
verified, so the R2 address is not exposed. No R2 public domain or browser CORS
configuration is needed.

Optional RLS integration test credentials (use a non-admin Google-authenticated
test account and a disposable course) are:

```dotenv
ADMIN_SECURITY_TEST_USER_ACCESS_TOKEN=<supabase-access-token>
ADMIN_SECURITY_TEST_COURSE_ID=<disposable-course-uuid>
```

Run `npm run test` for unit and database integration tests and
`npm run test:e2e` for Playwright route checks. Set the optional credentials
above to enable the signed-in RLS and route tests.

### Security notes

- Admin pages, server actions, and the admin layout independently call
  `requireAdmin()`. The proxy's 404 pre-check and no-index/no-store headers are
  defense in depth, not the authorization boundary.
- `admin_users` has RLS enabled and no client policies. `is_admin()` reveals
  only the caller's boolean admin status. Catalog writes and private thumbnail
  object writes are enforced by RLS; admin server code uses the signed-in
  user's session and never the service-role key.
- Admin actions use a database-backed per-admin rate limit. Course, lecture,
  note, and thumbnail changes are written to an append-only audit log.
- Only the server processes uploaded images. The server checks supported
  magic bytes and size, uses Sharp to resize/re-encode, and stores only WebP.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and model/API secrets in server-only
  environment variables. They must never use a `NEXT_PUBLIC_` prefix.

Enrolled learners can watch lectures. Free lectures may use YouTube or Bunny
Stream; paid lectures must use Bunny Stream.

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
   profiles, course tables, pgvector transcript storage, catalog tables, and
   RLS policies.

The Supabase anon/publishable key is intended for browser use. Do not expose a
service-role key, Gemini API key, or Google client secret in frontend code or
`NEXT_PUBLIC_*` variables.
