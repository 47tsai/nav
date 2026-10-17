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
3. Create a fine-grained GitHub token with Contents: Read and write access only to tsai97216/nav.
4. From this directory, run npx wrangler secret put NAV_GITHUB_TOKEN, then npx wrangler deploy.
5. Attach the custom domain nav-api.chi.qzz.io in Cloudflare and set API_BASE_URL in admin/auth-config.js to https://nav-api.chi.qzz.io.
6. Confirm the health endpoint responds before enabling write controls.

## Security and data notes

- No GitHub token or client secret belongs in browser code.
- Writes validate the complete dataset and use GitHub's current blob SHA to prevent stale overwrites.
- Existing links need stable id fields before edit/delete can work. A migration step must add IDs once before these controls are enabled.
- Every write creates a GitHub commit on main. No separate database is used.
- Automated deployment and real-browser testing are still required before production use.
