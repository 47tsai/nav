# Chi NAV Admin API

Cloudflare Worker backend for the NAV admin console. The browser must never receive the GitHub write token.

## Routes

- GET /health: public health check
- GET /api/admin/session: validate Chi Auth identity and admin access
- GET /api/admin/sites: read canonical data/data.json from GitHub
- POST /api/admin/sites: create a site
- PUT /api/admin/sites/:id: update a site
- DELETE /api/admin/sites/:id: delete a site
- GET /api/admin/categories: list categories and subcategories

All admin routes require a short-lived Chi Auth bearer token. The Worker validates it server-to-server against Chi Auth userinfo and currently authorizes only the stable chi-owner subject. CORS is restricted to https://nav.chi.qzz.io.

## Required setup

1. Register an OAuth client in Chi Auth for callback https://nav.chi.qzz.io/admin/ and allow origin https://nav.chi.qzz.io.
2. Set the resulting public Client ID in admin/auth-config.js and worker/wrangler.toml.
3. Create a fine-grained GitHub token with Contents: Read and write access only to 47tsai/nav.
4. In repository Settings > Secrets and variables > Actions, add secrets CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and NAV_GITHUB_TOKEN. Set repository variable DEPLOY_NAV_ADMIN_API to true to enable automatic deployment. The workflow deploys the Worker and sets NAV_GITHUB_TOKEN as a Worker Secret. CHI_AUTH_CLIENT_ID is a public OAuth client identifier configured in worker/wrangler.toml; it is not a secret required by this workflow.
5. Attach the custom domain nav-api.chi.qzz.io in Cloudflare. The current admin/auth-config.js already points API_BASE_URL to https://nav-api.chi.qzz.io.
6. Confirm the health endpoint responds before enabling write controls.

## Security and data notes

- No GitHub token or client secret belongs in browser code.
- Writes validate the complete dataset and use GitHub's current blob SHA to prevent stale overwrites.
- The admin login flow runs the stable-ID migration before loading the editable list. The API validates IDs and rejects duplicates before writing.
- Every write creates a GitHub commit on main. No separate database is used.
- Automated deployment and API regression tests are configured. The most recent recorded Worker deployment and validation run succeeded; complete real-browser checks of OAuth, mobile layout, and create/edit/delete flows remain a manual acceptance step.
