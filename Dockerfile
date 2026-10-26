FROM node:22-slim AS website-build
WORKDIR /website
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts vitest.config.ts tsconfig*.json ./
COPY src ./src
RUN VITE_API_BASE_URL=/api pnpm build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /source

COPY backend/src/Emergency112.Api/Emergency112.Api.csproj backend/src/Emergency112.Api/
RUN dotnet restore backend/src/Emergency112.Api/Emergency112.Api.csproj

COPY backend/src/Emergency112.Api/ backend/src/Emergency112.Api/
RUN dotnet publish backend/src/Emergency112.Api/Emergency112.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
USER app
COPY --from=api-build /app/publish ./
COPY --from=website-build /website/dist/ ./wwwroot/
EXPOSE 10000

# Render supplies PORT at runtime; the fallback supports local `docker run`.
ENTRYPOINT ["sh", "-c", "dotnet Emergency112.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
