# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directories
# this will cache them and speed up future builds
FROM base AS install

# install all dependencies (including dev)
WORKDIR /temp/dev
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# install production dependencies only
WORKDIR /temp/prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# copy dev node_modules and full source for validation
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# copy production dependencies and source code into final image
FROM oven/bun:1-distroless AS release
WORKDIR /usr/src/app

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src src
COPY --from=prerelease /usr/src/app/package.json .
# tsconfig.json is required at runtime for Bun to resolve path aliases
COPY --from=prerelease /usr/src/app/tsconfig.json .

# run the app
USER 1000
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
