# AI Company Valuation Ranking Test Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone local HTML test page for the approved AI company valuation ranking section without changing the production weekly pages.

**Architecture:** Create one dependency-free HTML file containing design tokens, sample data, rendering helpers, responsive layout, reader controls, mobile list switching, and an accessible detail drawer. Add a Node-based static contract test, then verify the actual interactions and responsive states in the in-app browser.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, Material Symbols, Node.js built-in test runner, in-app Browser.

---

### Task 1: Static Contract Test

**Files:**
- Create: `tests/ai_company_valuation_ranking_test.mjs`
- Test: `tests/ai_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Write a failing test for the standalone page contract**

The test reads `ai_company_valuation_ranking_test.html` and asserts that the page contains two ranking panels, top-three containers, ranking tables, reader controls, mobile tabs, the detail drawer, and the single source data array.

- [ ] **Step 2: Run the test and verify it fails because the page is missing**

Run: `node --test tests/ai_company_valuation_ranking_test.mjs`

Expected: FAIL with an `ENOENT` error for `ai_company_valuation_ranking_test.html`.

### Task 2: Standalone Ranking Prototype

**Files:**
- Create: `ai_company_valuation_ranking_test.html`
- Test: `tests/ai_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Create the single-file page shell and design tokens**

Include the approved title, explanatory copy, UI-test-data notice, reader controls, two ranking panels, and a drawer. Reuse the production page's neutral palette, blue accent, spacing rhythm, and font scale behavior.

- [ ] **Step 2: Add one sample data array and rendering helpers**

Add `companyValuationData`, `validateCompany`, `formatUsd`, `formatChange`, `getRankedCompanies`, `renderRanking`, and `openCompanyDrawer`. Derive ranks and display values from numeric data rather than storing duplicate labels.

- [ ] **Step 3: Add responsive and accessible interaction behavior**

Implement mobile private/public tabs, top-three cards, rank 4-10 rows, keyboard-operable detail triggers, Escape/backdrop/close handling, focus restoration, `aria-expanded`, theme persistence, and font-size persistence.

- [ ] **Step 4: Run the contract test and verify it passes**

Run: `node --test tests/ai_company_valuation_ranking_test.mjs`

Expected: PASS with all static contract assertions succeeding.

### Task 3: Browser Verification

**Files:**
- Verify: `ai_company_valuation_ranking_test.html`

- [ ] **Step 1: Open the page in the in-app browser**

Navigate the existing browser tab to the standalone file through a local HTTP server.

- [ ] **Step 2: Verify desktop rendering and interactions**

Confirm both rankings are visible, top-three cards and rows are ordered, theme and font controls update state, a company opens the drawer, Escape closes it, and focus returns to the trigger.

- [ ] **Step 3: Verify the 320px mobile layout**

Set the viewport width to 320px. Confirm only the selected ranking is visible, switching tabs changes panels, top-three cards use one column, the table does not overflow, and touch targets remain usable.

- [ ] **Step 4: Run final checks**

Run: `node --test tests/ai_company_valuation_ranking_test.mjs`

Expected: PASS with zero failures. Inspect browser console logs and confirm no page errors.

### Task 4: Unified Ranking Tabs

**Files:**
- Modify: `ai_company_valuation_ranking_test.html`
- Modify: `tests/ai_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Add failing contract assertions for standard tabs**

Require a persistent `tablist`, two `tab` controls, matching `tabpanel` regions, `aria-selected`, roving `tabindex`, `hidden`, and keyboard navigation hooks.

- [ ] **Step 2: Run the contract test and verify the new assertions fail**

Run: `node --test tests/ai_company_valuation_ranking_test.mjs`

Expected: FAIL because the prototype still uses mobile-only pressed buttons and CSS visibility.

- [ ] **Step 3: Implement one tab experience for desktop and mobile**

Replace the mobile-only segmented control with a full-width tablist. Show one ranking panel at a time on every viewport, update `aria-selected`, roving `tabindex`, and `hidden`, and support ArrowLeft, ArrowRight, Home, and End.

- [ ] **Step 4: Verify tests and rendered interaction**

Run the Node contract test, then use the in-app Browser to verify click and keyboard switching at desktop and 320px without horizontal overflow or console errors.
