# PR de esta aplicación

Este repositorio forma parte de `libreria-onix`. Antes de crear un PR, sigue el `AGENTS.md` del repositorio padre y `../quality/README.md`.

Ejecuta el gate desde el padre con `make qa-pr-check PR_REPO=akeneo-pim` y crea el PR con `make pr PR_REPO=akeneo-pim PR_ARGS="--draft --fill"`. No omitas las suites por falta de Docker ni uses producción. Los cambios de referencias visuales requieren revisión y commit. La workflow reutilizable necesita que la infraestructura de calidad del padre ya esté publicada en `main`.
