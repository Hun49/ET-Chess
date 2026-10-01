# ET-Chess Third-Party Licenses & Compliance Audit

This document details the open-source licensing inventory, obligations, and compliance procedures for the ET-Chess project.

---

## 1. Third-Party Licenses Inventory

| Component / Dependency | Version | License | Usage Scope | Distribution / Delivery |
| :--- | :--- | :--- | :--- | :--- |
| **Stockfish JS / WASM** | 10.0.2 | **GNU General Public License v3 (GPLv3)** | Offline / bot AI opponent | Client-side static asset (`apps/web/public/stockfish.js`) |
| **Better Auth** | ^1.7.6 | MIT | User authentication & sessions | Server Worker & Client SDK |
| **Hono** | ^4.13.9 | MIT | API web framework & router | Cloudflare Worker runtime |
| **Drizzle ORM** | ^0.45.3 | Apache-2.0 | SQL query builder & migrations | Server Worker runtime |
| **React / React Native** | 19.x / 0.86.x | MIT | UI rendering & components | Web & Mobile applications |
| **Expo** | ^57.x | MIT | Mobile application toolchain | iOS & Android builds |
| **Vitest / Biome** | 3.x / 2.x | MIT | Testing & Linting toolchain | Development only |

---

## 2. Stockfish GPLv3 Compliance Checklist

Stockfish is an authoritative open-source chess engine authored by Tord Romstad, Marco Costalba, Joona Kiiski, Gary Linscott, and contributors, distributed under the **GNU General Public License v3.0**.

### Compliance Checklist:

- [x] **Copyright Notice Preservation:**
  The complete copyright notice, author attribution, and license declaration are intact at the head of `apps/web/public/stockfish.js`:
  ```javascript
  /*!
   * Stockfish copyright T. Romstad, M. Costalba, J. Kiiski, G. Linscott
   * and other contributors.
   * Multi-variant support by Daniel Dugovic and contributors.
   * Released under the GNU General Public License v3.
   * Compiled to JavaScript and WebAssembly by Niklas Fiekas.
   * https://github.com/niklasf/stockfish.js
   */
  ```

- [x] **Source Code Availability:**
  In accordance with Section 6 of GPLv3, complete corresponding source code for the distributed Stockfish binary and WebAssembly port is accessible via:
  - Official Stockfish Repository: `https://github.com/official-stockfish/Stockfish`
  - Web Worker & WASM Port Repository: `https://github.com/niklasf/stockfish.js`

- [x] **Architectural Boundary & Process Isolation:**
  The ET-Chess application codebase communicates with Stockfish strictly across standard IPC / Worker boundaries:
  - Communication is exclusively via the text-based Universal Chess Interface (UCI) protocol (`uci`, `isready`, `position fen`, `go movetime`, `bestmove`).
  - Stockfish executes entirely inside an isolated Web Worker (`Worker` API) or separate native background thread (`packages/bot-engine`).
  - No static linking or memory-space coupling occurs between proprietary ET-Chess client code and the GPL-licensed engine.

- [x] **GPLv3 Full License Text:**
  A copy of the GNU General Public License v3 is provided in this repository or accessible at `https://www.gnu.org/licenses/gpl-3.0.txt`.

---

## 3. Production Environment & Secrets Safety

- **BETTER_AUTH_SECRET:**
  Must be set to a cryptographically secure random string with minimum 32 characters in production. If missing or shorter than 32 characters, the Cloudflare Worker throws a fatal exception during boot (`createAuth`), preventing insecure startup.
- **D1 Database Binding:**
  Database operations are managed directly through Cloudflare D1 environment bindings (`c.env.DB`), preventing credential leakage or plaintext connection strings in environment variables.
- **CORS Allowlist:**
  Strict domain allowlists are enforced based on `ALLOWED_ORIGINS` environment variables with origin verification.
