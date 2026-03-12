# CLAUDE.md

## 🚨 AI Agent Instructions: Token Efficiency & Cost Reduction 🚨
- **DO NOT** run expensive or unnecessary commands (like `npm run build`, full test suites, or broad filesystem searches) after every minor code modification.
- **DO NOT** output large chunks of unchanged code or run commands that process massive console logs unless strictly required for debugging.
- **DO NOT** execute `npm run build` or `npm run preview` unless the user explicitly requests a production check.
- **ALWAYS** prioritize surgical, precise file replacements over rewriting entire files to save tokens.


## Project Documentation

**Crucial:** Detailed project architecture, data models, and main workflows have been extracted and documented in `docs/Guide.md`. **Always review `docs/Guide.md`** whenever you need to understand the backend abstractions, the state machines, or frontend integrations comprehensively.


### Frontend (React + Vite)
```bash
# From C:\GRAPP\frontend
npm install       # Install dependencies
npm run dev       # Dev server on http://localhost:5173
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Environment & Tooling Quick Hints
- Copy `.env.example` to `.env`; defaults to SQLite
- Set `DB_ENGINE=postgres` con las credenciales de PostgreSQL si aplica (ver GUIA_MIGRACION_POSTGRESQL.md)
- El Frontend (Vite) dirige la subruta `/media` hacia `http://localhost:8000`
- API configurada para aceptar `http://localhost:5173` a través de CORS restrictivo.
