# Security deployment and recovery

Public origin: `https://financetracker.wt.id.vn`. The cloudflared connector at
`192.168.10.177` forwards to `http://192.168.10.160:5050`.

## Ingress and credentials

Port 5050 belongs to the unprivileged nginx ingress. It allows only the connector
address, overwrites forwarding headers and forwards to the private app on the
Compose network. App port 3000 is not published. Admin 6070 and PostgreSQL 4500
remain bound to loopback. Direct LAN calls to 5050 are denied, including callers
supplying forged Cloudflare headers. If the connector changes address, update
`deploy/nginx.conf` before switching it. The connector-to-origin HTTP hop relies
on the trusted LAN; migrating that hop to TLS requires changing both ends.

Only nginx may supply the app's `X-Real-IP`; the app validates that it is a single
IP address. Never publish the app directly with `TRUST_PROXY=true`. Rate limits
are bounded process-local maps for this single-instance deployment. Before adding
app replicas, move these counters into a shared store.

The app receives only its restricted database URL, canonical origins and UI flag.
Admin receives a separate restricted database URL and ADMIN_TOKEN. The owner URL
and PostgreSQL owner password stay outside both runtime containers. Containers run
as non-root with read-only filesystems, dropped capabilities and resource limits.

The role provisioning script grants data access, not schema ownership or
superuser/role/database creation. Use the owner URL only for migrations. Credentials
are generated into the ignored `.env` with mode 0600; do not print Compose's fully
resolved configuration or include it in public logs.

## Password recovery

The anonymous password-replacement request and legacy approve endpoints are
disabled. Old PENDING requests cannot be approved, including after backup restore.

1. Verify the account owner's identity through their previously established
   contact channel, independently of anything submitted through the public site.
2. Open the localhost admin UI using an SSH local forward if needed, enter the
   admin token, load users and click **Cấp liên kết khôi phục** on the correct user.
3. Confirm that identity was verified. Send the generated link privately to that
   person. It expires after 15 minutes; issuing another link invalidates the old one.
4. The link carries its secret in the URL fragment, which is not sent in HTTP
   request URLs. The browser removes it from the address bar and keeps it only in
   memory while the user chooses a new password of 12–128 characters.

Successful recovery atomically changes the password, consumes all outstanding
recovery tokens and revokes all sessions. Direct admin password changes and
disabling an account do the same. Login session issuance uses the same user-row
lock so a stale password verification cannot create a session after a change.
Existing short passwords remain usable for login; new passwords must meet the
new minimum. Production cookies are `__Host-session`, HttpOnly, Secure and
SameSite=Lax. Session lookup accepts only the digest of a valid random raw token.

## Cache, CSP and request rules

All dynamic pages and API responses, including errors, carry private/no-store
headers for browsers and CDNs. A new random CSP nonce is generated per page and
passed to Next scripts and the theme bootstrap; production scripts do not permit
unsafe-inline or unsafe-eval. The admin uses a script hash and escaped user data.

Every cookie-authenticated API mutation requires an exact allowed Origin.
CLI/API clients must explicitly send `Origin: https://financetracker.wt.id.vn`.
Missing/null/foreign origins and cross-site Fetch Metadata are rejected even if
the request bypasses framework middleware. JSON is read with an actual byte limit
of 1 MiB, independent of Content-Length, plus field/type/length validation.

Cloudflare must not override these headers with Cache Everything or a Worker that
stores personal HTML/JSON. Cache only static assets with hashed filenames. The
application changes do not modify policies in the remote Cloudflare dashboard.
Access/MFA can be added as a separate product policy if the app should be private.

Read/write limits apply per user, authentication limits per account/client, and an
additional API client limit protects unauthenticated routes. Password derivation
is asynchronous and limited to four concurrent operations. CSV export allows four
requests per minute/user and at most 10,000 records per export; choose a narrower
date range for larger exports. Legacy transaction/exchange list APIs return the
latest 1,000 rows; the UI uses the paginated history API for browsing.

## Install and upgrade

1. Create private `.env` from `.env.example` using random owner/admin credentials.
2. Start PostgreSQL: `docker compose up -d db`.
3. Run owner migrations with `docker compose run --rm --build migrate`. This
   temporary tools service receives the owner URL; public app/admin never do.
   Provision roles with
   `node scripts/provision-runtime-roles.mjs` after the initial migrations.
4. Run the appropriate unit/integration/browser checks, build with
   `docker compose build app admin migrate`, and validate nginx with
   `docker compose run --rm --no-deps --entrypoint nginx ingress -t`.
5. For upgrades, back up the DB/source/config/images, stop app/admin writers,
   run `docker compose run --rm --no-deps migrate`, then run
   `docker compose up -d --no-deps app admin ingress`. Verify the public domain,
   login/logout/recovery, denied LAN ingress, container users and DB privileges.

The security migration revokes all old sessions and rejects old pending anonymous
reset requests. Financial records are preserved. Application backup restore never
reactivates sessions; recovery tokens are intentionally excluded from JSON backup.
Protect system JSON/dumps because they contain personal data and password hashes.

Admin JSON backup export and restore share a 10 MiB request limit. Export checks
UTF-8 bytes including the compact `{ mode: "replace", backup }` restore envelope
used by the file picker (append is smaller). Oversized exports return HTTP 413
with an error instead of a backup that cannot be restored. For larger datasets,
use PostgreSQL `pg_dump`/`pg_restore`; these dumps cannot be imported by the JSON
picker. Stop writers and retain a fresh dump before replacing database data.

## Tests and dependency maintenance

`npm test`, `npm run lint`, `npm run build`, `npm audit` and
`npm audit --omit=dev` are the standard checks. Integration/browser tests use only
the local disposable database named `finance_tracker_test`; integration tests
delete fixture data. See `tests/security-scenarios.cjs` for concurrency checks.

`vendor/braces` is an explicit temporary source patch for
GHSA-vfj7-8cjw-p6xm because the upstream registry had no patched release. It bounds
parser/AST nesting, retains the upstream license and has regression coverage.
See its SECURITY-PATCH.md. Replace it with an audited upstream fix when available;
an audit reporting zero does not independently validate our local patch.

## Rollback for the 2026-10-17 repair

Private rollback materials are in
`backups/security-20261017T074629Z/`: pre-change source/config archive,
verified PostgreSQL custom-format dump and original image IDs. Original images
also have `security-rollback-20261017T074629Z` tags. This directory is mode 0700,
its files mode 0600. `backups/latest-security-backup-path` identifies the directory.

For an application-only rollback, stop ingress/app/admin, recover the previous
Compose/env files from the archive and use the recorded image tags without
rebuilding. The new recovery table can remain unused by the old code. Session
revocations are intentional; avoid restoring old session credentials. Restoring
the full database dump replaces financial data and must only be done after
stopping writers and retaining a fresh dump of the current state. Do not restore
the old dump just to revert UI/application code.
