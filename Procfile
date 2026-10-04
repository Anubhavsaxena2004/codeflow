# Run the GitHub-integrated CodeFlow app on any host that executes this file.
#
# Usage (no hosting dashboard required):
#   pnpm install --prod
#   pnpm next build
#   DATABASE_URL=<your-production-postgres> \
#   TOKEN_ENCRYPTION_KEY=<16+ chars> \
#   GITHUB_CLIENT_ID=<...> GITHUB_CLIENT_SECRET=<...> \
#   PORT=<port> pnpm next start
#
# Deviations (dev/prod.db URL, optional TLS CA cert):
#   DATABASE_CA_CERT_PATH=./certs/aiven-ca.pem

web: pnpm install --prod
release: pnpm next build
run: pnpm next start
