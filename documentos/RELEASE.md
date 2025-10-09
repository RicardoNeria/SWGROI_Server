# Publicación y CI/CD mínimo

## Flujo
1. Aumente versión SemVer y actualice `CHANGELOG.md`.
2. Cree tag `vX.Y.Z` y empuje a GitHub.
3. GitHub Actions construirá y adjuntará artefactos.
4. Ejecute `ops/release/pack.ps1` para generar `deploy.zip` local si desea.

## Artifacts
- Binarios y `.dll`.
- `wwwroot/` completo.
- `app.config`, `docs/DEPLOY_VPS_WINDOWS.md`.

