# Build stage
FROM node:26 AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Node stopped bundling Corepack after Node 24 and the official node images do not
# install it, so `corepack enable` is `not found` on node:26. `packageManager` in
# package.json still decides which pnpm is used, hash included.
# Pinned on purpose: release builds run without a layer cache, so a floating tag
# would make every release depend on whatever corepack shipped that day. Dependabot
# only tracks `FROM` tags, so bump this by hand.
RUN npm install -g corepack@0.36.0 && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# The runtime needs the production dependencies only. The install above had to
# pull in the dev toolchain so `pnpm run build` could run, and none of it —
# typescript, vitest, oxlint, tsx — belongs in a published image. Pruning here
# rather than reinstalling in the runner keeps pnpm and corepack out of the
# runtime stage entirely.
#
# `CI=true` because pnpm refuses to remove a modules directory it cannot ask
# about: without a TTY and without that variable it aborts with
# ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. The runner sets `CI`, but a
# `docker buildx build` container does not inherit it.
RUN CI=true pnpm prune --prod

# Runtime stage
FROM node:26-slim AS runner

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

ARG VERSION
ENV APP_VERSION=$VERSION

CMD ["node", "build/index.js"]