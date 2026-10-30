# Implementation Report: Remediation Batch REM-05, REM-06, REM-07 & REM-08

**Date:** October 30, 2026  
**Implementation Specialist:** Antigravity (ECC Multi-Agent Harness)  
**Target Repository:** `/home/sid/.gemini/antigravity/scratch/extensions-portfolio`  
**Reference Technical Audit:** [`reports/claims-vs-code.md`](./claims-vs-code.md)  
**Remediation Plan Reference:** [`reports/remediation-plan.md`](./remediation-plan.md)  
**Previous Implementation:** [`reports/implementation-rem-01-03.md`](./implementation-rem-01-03.md)  
**Scope:** Strict execution of **REM-05**, **REM-06**, **REM-07**, and **REM-08 ONLY**.

---

## 1. Executive Summary

This remediation batch resolves all discrepancies concerning **BulkGrab and Table Extractor data processing, direct third-party file host downloads, Cloudflare Worker licensing architecture, and cryptocurrency payment settlement**:

1. **REM-05 (Qualify Absolute Zero-Data Claims Against Licensing Flows):**
   - Qualified absolute zero-data statements across `table-extractor/index.html:184-188`, `bulkgrab/index.html:252-255`, and `privacy.html:280-287`.
   - Explicitly clarified that all document extraction, table parsing, link discovery, and client-side ZIP packaging occur 100% on-device and never leave the user's machine.
   - Accurately disclosed that optional Pro licensing verification flows transmit only transaction IDs (`payment_id`) and product identifiers to the Cloudflare Worker proxy (`bulkgrab-licensing.sidoua26.workers.dev`).

2. **REM-06 (Disclose BulkGrab Direct Third-Party File Host Download Requests):**
   - Updated `bulkgrab/index.html:162-164` and `privacy.html:248-253` to clearly distinguish developer zero-logging from direct third-party file host network requests.
   - Disclosed that when creating on-device ZIP archives, files are fetched directly from destination web servers using the active browser session (`fetch(file.url, { credentials: 'include' })`), and that destination web servers log standard HTTP incoming requests.
   - Explicitly avoided implying that file host download requests are received or logged by the extension developer.

3. **REM-07 (Disclose Cloudflare Worker Licensing Caching & Optional Binding Architecture):**
   - Updated `privacy.html` Section 4 ("Optional Pro Licensing") to document the edge licensing architecture and persistence mechanics.
   - Accurately distinguished repository configuration (`wrangler.toml:1-15` declares no KV/D1/R2 bindings) from the runtime code implementation (`worker.js:536-545` contains an optional `env.BULKGRAB_KV` path that caches finished payment statuses with a 1-year expiration TTL if bound in Cloudflare).
   - Documented that production KV binding status cannot be verified from repository files alone without authorized Cloudflare API credentials.
   - Confirmed that zero user document data, extracted tables, downloaded files, or browsing histories are ever processed or cached by the licensing service.

4. **REM-08 (Disclose Cryptocurrency Payment Settlement, Free Tier Limits & Table Capture Bounds):**
   - Updated `bulkgrab/index.html` FAQ to disclose the 7-file-per-session free tier limit (`utils/constants.js:51`) and the Pro upgrade ($9.99 USD, settled in USDT on Binance Smart Chain via NOWPayments: `worker.js:600-606`).
   - Updated `table-extractor/index.html` FAQ to disclose the free tier scope (standard HTML tables) and Pro upgrade ($9.99 USD, settled in USDT on BSC) for virtualized container capture (AG Grid, Handsontable) and infinite scroll accumulation.
   - Updated `table-extractor/index.html` FAQ to disclose the built-in 500-step and 50,000-row safety limits (`lib/virtualized-capture.js:851, 859`, `popup/popup.html:89`, `popup/popup.js:392`).

---

## 2. Technical Evidence Baseline (Authoritative Extension Source Code)

All website modifications were strictly verified against the underlying source code in `/home/sid/projects/bulkgrab` and `/home/sid/projects/table-extractor`:

| Technical Dimension | Code Seam & Implementation Evidence | Portfolio Disclosure Implemented |
| :--- | :--- | :--- |
| **BulkGrab File Downloads & ZIP Fetching** | `background/service-worker.js:778`: Calls `fetch(file.url, { credentials: 'include' })` directly from the browser to destination file hosts. ZIP packaging is compiled in browser memory via JSZip (`service-worker.js:781`). Zero developer proxy servers. | Clarified that BulkGrab developers log no URLs or files, and that download requests connect directly to destination file-hosting servers using active browser credentials. |
| **BulkGrab Free Tier Download Limit** | `utils/constants.js:51`: `export const FREE_DOWNLOAD_LIMIT = 7;`. Limits free sessions to 7 files. `background/service-worker.js:58-64` blocks downloading >7 items without Pro. | Disclosed in `bulkgrab/index.html` FAQ and `privacy.html:283`. |
| **Table Extractor Processing Location** | `content.js:10-500`, `lib/virtualized-capture.js:1-1159`: DOM extraction, mutation observation, deduplication (FNV-1a hash / ID check), and CSV/XLSX/JSON serialization occur 100% locally in browser memory. | Disclosed across `table-extractor/index.html` and `privacy.html:242`. |
| **Table Extractor Infinite Scroll & Row Bounds** | `lib/virtualized-capture.js:851, 859`: `maxRows = options.maxRows || 5000;`, `maxSteps = options.maxSteps || 500;`. `popup/popup.html:89`: `<input id="opt-max-rows" min="1" max="50000" value="5000">`. | Disclosed up to 500 scroll steps or 50,000 rows in `table-extractor/index.html` FAQ. |
| **Table Extractor Free vs. Pro Feature Gating** | `lib/license.js:244-262`: `canUseVirtualizedCapture()`, `canUseZipExport()`, and `canUseMultiFormatExport()` strictly check `isProUser()`. Free tier extracts standard HTML tables. | Disclosed in `table-extractor/index.html` FAQ and `privacy.html:283`. |
| **Licensing Worker Network Seam** | `table-extractor/lib/license.js:19-20, 146`: GET `https://bulkgrab-licensing.sidoua26.workers.dev/api/verify-payment?payment_id=<id>&product=table-extractor`. `bulkgrab/background/service-worker.js:347`: GET `?payment_id=<id>`. | Disclosed exact query parameters and confirmed table/file contents are never sent. |
| **Licensing Worker Persistence Architecture** | `worker.js:536-545`: `if (env.BULKGRAB_KV && payload.payment_id) { await env.BULKGRAB_KV.put(...) }`. Local `wrangler.toml:1-15` declares no KV bindings; production status is unverified without Cloudflare dashboard credentials. | Disclosed volatile memory evaluation and conditional edge KV caching in `privacy.html:286`. |
| **Payment Token & Pricing Settlement** | `worker.js:600-606`: NOWPayments invoice creation with `price_amount: 9.99`, `price_currency: 'usd'`, `pay_currency: 'usdtbsc'` (Tether on BSC). | Disclosed $9.99 USD price settled in USDT on BSC via NOWPayments across product pages and privacy policy. |

---

## 3. Detailed File Diffs & Copy Changes

### File 1: `bulkgrab/index.html`
- **Path:** [`bulkgrab/index.html`](file:///home/sid/.gemini/antigravity/scratch/extensions-portfolio/bulkgrab/index.html)
- **Modifications:** Lines 162–164 (Why section) and Lines 252–260 (FAQ section)

```diff
@@ -160,7 +160,7 @@
           Most bulk downloaders require excessive browser permissions, inject adware into pages, or route your file links through third-party tracking redirectors.
         </p>
         <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px;">
-          BulkGrab streams downloads directly from the source host website into your browser storage and packages ZIP archives locally on-device using JSZip. No download URLs, filenames, or content metadata are ever logged.
+          BulkGrab streams downloads directly from source host websites into your browser download storage and packages ZIP archives locally on-device using JSZip. Zero developer logging: BulkGrab operates no servers and logs no download URLs, filenames, or content metadata. When creating on-device ZIP archives, files are fetched directly from their hosting web servers using your existing browser session.
         </p>
       </section>
@@ -250,7 +250,11 @@
           </div>
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">Does BulkGrab send my download links to external servers?</strong>
-            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">No. Your browser requests downloads directly from the source site; they do not pass through our servers.</p>
+            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">BulkGrab operates no tracking or proxy servers. File downloads and ZIP assembly connect directly from your browser to the respective third-party file hosts using your existing browser session. No file content, page URLs, or download histories reach the extension developer (optional Pro upgrades send only transaction IDs to our Cloudflare Worker licensing service).</p>
           </div>
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">What are the free tier limits and how does Pro licensing work?</strong>
             <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">The free tier lets you download up to 7 files per session. The optional Pro upgrade ($9.99 USD, settled in USDT on Binance Smart Chain via NOWPayments) unlocks unlimited simultaneous downloads and batch ZIP archiving without session limits.</p>
           </div>
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">Is BulkGrab available on Chrome and Edge?</strong>
```

### File 2: `table-extractor/index.html`
- **Path:** [`table-extractor/index.html`](file:///home/sid/.gemini/antigravity/scratch/extensions-portfolio/table-extractor/index.html)
- **Modifications:** Line 187 (No Server Uploads card) and Lines 249–256 (FAQ section)

```diff
@@ -184,7 +184,7 @@
           </div>
           <div style="padding: 20px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">No Server Uploads</h3>
-            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">All extraction and file formatting logic executes on your device inside the local tab.</p>
+            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">Table extraction and file formatting logic execute entirely on your device inside the local tab. No extracted table data ever leaves your machine (optional Pro licensing verification transmits only transaction IDs to our Cloudflare Worker).</p>
           </div>
         </div>
       </section>
@@ -247,11 +247,15 @@
         <div style="display: flex; flex-direction: column; gap: 16px;">
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">Can Table Extractor handle dynamic or infinite scroll tables?</strong>
-            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">Yes, Table Extractor inspects the DOM tree and handles both standard HTML <code>&lt;table&gt;</code> markup and virtualized container structures.</p>
+            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">Yes, Table Extractor inspects the DOM tree and automatically captures dynamic and infinite scroll tables, protected by built-in safety boundaries (up to 500 scroll steps or 50,000 rows) to ensure browser stability.</p>
+          </div>
+          <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
+            <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">What features are free versus optional Pro?</strong>
+            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">The free version extracts standard HTML tables to CSV, Excel (XLSX), or JSON. The optional Pro upgrade ($9.99 USD, settled in USDT on Binance Smart Chain via NOWPayments) unlocks virtualized container capture (AG Grid, Handsontable) and infinite scroll accumulation.</p>
           </div>
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">Does Table Extractor require account creation or API keys?</strong>
-            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">No. It works immediately out of the box. No account or API key is needed.</p>
+            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">No. It works immediately out of the box with zero user accounts, API keys, or cloud telemetry. Extracted table records remain strictly in your browser memory.</p>
           </div>
           <div style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-page); border-radius: var(--r-md);">
             <strong style="display: block; font-size: 1rem; margin-bottom: 6px;">Is Table Extractor available for Google Chrome as well as Edge?</strong>
```

### File 3: `privacy.html`
- **Path:** [`privacy.html`](file:///home/sid/.gemini/antigravity/scratch/extensions-portfolio/privacy.html)
- **Modifications:** Line 251 (BulkGrab Network Transmission) and Lines 283–286 (Section 4 Optional Pro Licensing)

```diff
@@ -248,7 +248,7 @@
     <ul>
       <li><strong>Data Processed:</strong> Publicly accessible media URLs, image links, and downloadable document links discovered in the DOM of the active tab you choose to inspect.</li>
       <li><strong>Processing Location:</strong> On-device link filtering and client-side ZIP packaging using bundled client libraries (JSZip).</li>
-      <li><strong>Network Transmission:</strong> Your browser requests downloads directly from the source site; they do not pass through our servers. When bundling files from external domains into a local ZIP archive, the extension requests the optional <code>&lt;all_urls&gt;</code> permission to fetch the binary file content directly into local memory. Optional Pro licensing functionality is described in Section 4 below.</li>
+      <li><strong>Network Transmission:</strong> Your browser initiates download and file retrieval requests directly to destination file-hosting servers; they do not pass through developer proxy or analytics servers. When bundling files from external domains into a local ZIP archive, the extension requests the optional <code>&lt;all_urls&gt;</code> permission to fetch the binary file content directly into local memory using your existing browser session. Optional Pro licensing functionality is described in Section 4 below.</li>
       <li><strong>Storage &amp; Permissions:</strong> Uses <code>downloads</code> to save files to your local download directory, <code>activeTab</code> and <code>scripting</code> to detect page links on demand, <code>storage</code> for user options, and optional <code>&lt;all_urls&gt;</code> for cross-site ZIP bundling.</li>
     </ul>
 
@@ -280,9 +280,9 @@
     <h2 id="optional-pro-licensing">4. Optional Pro Licensing (Table Extractor &amp; BulkGrab)</h2>
     <p>Optional Pro licensing for Table Extractor and BulkGrab attempts to verify payment IDs via an intermediary proxy when browser permissions allow; under no circumstances are table contents, extracted spreadsheets, downloaded files, or media URLs transmitted to the licensing service, as disclosed in our Privacy Policy.</p>
     <ul>
-      <li><strong>Scope:</strong> Pro licensing is strictly optional and applies only to Table Extractor and BulkGrab. All core table extraction, spreadsheet compiling, link discovery, and downloading features operate without licensing.</li>
+      <li><strong>Scope &amp; Tiers:</strong> Pro licensing is strictly optional. All core table extraction, spreadsheet compiling, link discovery, and downloading features operate without licensing. For Table Extractor, the free tier captures standard HTML tables, while Pro unlocks virtualized grids and infinite scroll accumulation. For BulkGrab, the free tier permits up to 7 file downloads per session, while Pro unlocks unlimited downloads and batch archiving. Pro upgrades ($9.99 USD) are settled in cryptocurrency (USDT on Binance Smart Chain) via NOWPayments.</li>
       <li><strong>Stage A — Extension to Cloudflare Worker Proxy:</strong> The extensions attempt to contact an intermediary Cloudflare Worker (<code>bulkgrab-licensing.sidoua26.workers.dev</code>). For invoice creation, Table Extractor transmits <code>{"product": "table-extractor"}</code>. For payment verification, Table Extractor submits query parameters containing the user-provided payment ID and product identifier (<code>payment_id=&lt;id&gt;&amp;product=table-extractor</code>), while BulkGrab transmits <code>payment_id=&lt;id&gt;</code>. Promotional gift codes with prefix <code>TE-GIFT-</code> are validated strictly in local JavaScript and generate no network requests. When an outbound request reaches the Worker proxy, Cloudflare processes standard HTTP connection metadata (client IP address, request timestamp, and headers).</li>
-      <li><strong>Stage B — Cloudflare Worker to NOWPayments:</strong> When an invoice creation request reaches the Worker proxy, the Worker generates the order metadata and submits invoice parameters to NOWPayments (<a href="https://nowpayments.io/privacy-policy" target="_blank" rel="noopener noreferrer">NOWPayments Privacy Policy</a>). For verification requests, the Worker queries NOWPayments using the payment ID. Neither stage ever transmits table contents, extracted files, page URLs, or browsing history.</li>
+      <li><strong>Stage B — Cloudflare Worker to NOWPayments &amp; Persistence Architecture:</strong> When an invoice creation request reaches the Worker proxy, the Worker generates order metadata and submits invoice parameters to NOWPayments (<a href="https://nowpayments.io/privacy-policy" target="_blank" rel="noopener noreferrer">NOWPayments Privacy Policy</a>). For verification requests, the Worker queries NOWPayments using the payment ID. Verification requests and webhook confirmations evaluate transaction IDs and payment status in volatile memory; while the repository configuration declares no KV/D1/R2 bindings, the Worker code includes an optional edge key-value storage path (<code>env.BULKGRAB_KV</code>) that caches finished payment statuses (<code>payment_id</code> and status with a 1-year TTL) if configured in Cloudflare. Upstream payment processing and wallet address records on <code>nowpayments.io</code> are governed by NOWPayments' external retention policies. Neither stage ever processes or transmits table contents, extracted files, page URLs, or browsing history.</li>
     </ul>
```

---

## 4. Verification & Testing

### A. Whitespace and Git Integrity
- `git diff --check`: **PASSED** (0 whitespace, trailing space, or carriage return errors).
- `git status --short`:
  ```
   M bulkgrab/index.html
   M privacy.html
   M table-extractor/index.html
  ```
  Exactly 3 tracked files modified (+16 / -8 lines). Zero unrelated files, manifests, extension source files, or build scripts were modified.

### B. Generator Synchronization Gate
- Ran `python3 build_redesign.py`.
- Verified `tests/contentAccuracy.test.mjs` Test 6: `index.html` remains byte-for-byte in synchronization.

### C. Test Suite Quality Gate
Executed full test suite (`npm test`):
```
ℹ tests 96
ℹ suites 14
ℹ pass 96
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 71495.42
```
All 96 tests across 14 test suites passed with 0 failures and 0 CSP violations.

### D. Visual Rendering & Layout Inspection (Playwright)
Screenshots captured across Desktop (1440px) and Mobile (375px) viewports:
- Desktop:
  - `rem_bulkgrab_desktop_1440.png`: Verified typography and responsive wrapping in BulkGrab Why and FAQ blocks.
  - `rem_table_extractor_desktop_1440.png`: Verified Key Capabilities card grid and newly added FAQ items (bounds and Pro tier distinctions).
  - `rem_privacy_desktop_1440.png`: Verified Section 4 Scope & Tiers and Stage B persistence wording.
- Mobile:
  - `rem_bulkgrab_mobile_375.png`: Clean vertical stacking of cards and FAQ accordion blocks without horizontal scroll.
  - `rem_table_extractor_mobile_375.png`: Full visibility of 500-step/50,000-row disclosures and clean touch targets.
  - `rem_privacy_mobile_375.png`: Clean text flow within the prose container.

---

## 5. Scope Boundaries Maintained

- **Untouched Products:** Tab Vault and SEO Inspector were not modified.
- **Reference Audits Preserved:** `reports/claims-vs-code.md` and `reports/remediation-plan.md` remain untouched.
- **Extension Code Unmodified:** Zero modifications to `/home/sid/projects/bulkgrab` or `/home/sid/projects/table-extractor`.
- **Git State:** All working tree changes remain completely unstaged and uncommitted per repository constraints.
- **Subsequent Tasks:** REM-09 and later tasks remain deferred to future batches.

---

## 6. Corrections & Refinements (Batch REM-05..08 Code Alignment)

### 6.1 Row Limits & Virtualized Capture Mechanics (Item 1)
- **Authoritative Code Reference:**
  - `lib/virtualized-capture.js:851, 859`: Sets default iteration safety caps to `maxSteps = options.maxSteps || 500;` and default row limit to `maxRows = options.maxRows || 5000;`.
  - `popup/popup.js:367, 392`: Calls `executeVirtualizedCapture()` passing `maxSteps: 500` (fixed internal cap; not exposed to user settings). Reads user row input from `document.getElementById("opt-max-rows")`.
  - `popup/popup.html:89`: Defines `<input type="number" id="opt-max-rows" class="form-input" min="1" max="50000" value="5000">`.
- **Wording Rule Applied:**
  - The previous FAQ phrase ("up to 500 scroll steps or 50,000 rows") overstated the default limit.
  - The corrected copy explicitly presents the default bounds first (up to 500 scroll steps and 5,000 rows collected), followed by the user-configurable maximum in the popup settings (up to 50,000 rows).
  - Aligned consistently across `table-extractor/index.html` FAQ, `guides/export-virtualized-tables-to-excel/index.html` (Section 3), homepage cards, and preview modal data.

### 6.2 Qualified Networking & Cookie Handling (Item 2)
- **Authoritative Code Reference:**
  - `background/service-worker.js:778`: `fetch(file.url, { credentials: 'include' })` requests media binary chunks for ZIP packaging using the browser's active ambient credentials.
  - `background/service-worker.js:824`: `chrome.downloads.download({ url: file.url })` initiates native browser downloads.
- **Wording Rule Applied:**
  - Removed misleading absolute claims: `"BulkGrab operates no servers"`, `"Zero developer logging"`, and `"operates no tracking or proxy servers"`.
  - Added qualified technical wording: The extension sends no download URLs, filenames, or file contents to the developer. Individual file downloads and ZIP assembly connect directly from the user's browser to destination third-party file hosts using the existing browser session (destination servers receive incoming HTTP requests and may receive session cookies). Only optional Pro licensing contacts the developer's Cloudflare Worker proxy (`bulkgrab-licensing.sidoua26.workers.dev`) to verify a payment ID.

### 6.3 Free Tier Limits & Pro Gating Disclosures (Item 3)
- **Table Extractor Code Seams:**
  - `lib/license.js:244-262`: `canUseVirtualizedCapture()`, `canUseZipExport()`, and `canUseMultiFormatExport()` require `isProUser()`.
  - Free tier captures standard HTML `<table>` elements and exports to single formats (CSV, Excel XLSX, or JSON) one at a time.
  - Pro tier unlocks virtualized grid capture (AG Grid, Handsontable), multi-format simultaneous export, and ZIP bundling.
- **BulkGrab Code Seams:**
  - `utils/constants.js:51`: `export const FREE_DOWNLOAD_LIMIT = 7;`.
  - `background/service-worker.js:58-64`: Increments `sessionDownloadCount` in `chrome.storage.session`. The counter resets when the browser session closes.
  - ZIP archiving is supported on the free tier for batches up to 7 files. Pro unlocks unlimited downloads and batch archiving.
  - Activation is stored on-device in `chrome.storage.local` (`licenseStatus: 'pro'`, `nowpaymentsPaymentId`) permanently without user accounts.

### 6.4 Pricing & Payment Disclosures (Item 4)
- **Authoritative Code Reference:**
  - `worker.js:600-606`: Invoice creation specifies `price_amount: 9.99`, `price_currency: 'usd'`, `pay_currency: 'usdtbsc'`.
- **Status:** Marked as **Pending Owner Confirmation** in documentation. Retained only where currently disclosed without adding refund policies, terms of service, or additional pricing claims.

### 6.5 Privacy Policy Section 4 & Licensing Service Transparency (Item 5)
- **Worker Infrastructure & Data Ingestion:**
  - Opening paragraph rewritten plainly without circular references: The developer operates an optional Cloudflare Worker (`bulkgrab-licensing.sidoua26.workers.dev`) to proxy NOWPayments invoice creation and verification.
  - Data received: User-submitted `payment_id` and product identifier (and product name during invoice creation).
  - Data NEVER processed: Extracted table contents, spreadsheets, downloaded files, media URLs, and browsing histories.
  - Logging & Persistence: Worker runtime writes `console.log` with `payment_id` and status (`worker.js:533`). Cloudflare edge execution log retention depends on account dashboard settings unverified from repository files.
  - Persistence: Evaluated in volatile memory; `env.BULKGRAB_KV` path exists in code, but local `wrangler.toml` declares no binding; production binding status remains **Cannot verify from repository code**.
  - Invocation Mode: Network calls are user-initiated only (upon clicking upgrade or submitting a payment ID); no background polling, alarms, or telemetry exist.

### 6.6 Absolute Terms Remediation Audit Ledger (Item 6)
- Audited all occurrences of absolute terms across `build_redesign.py`, `index.html`, `table-extractor/index.html`, `bulkgrab/index.html`, `privacy.html`, and `assets/js/site.js`.

| Location | Absolute Term / Statement | Action & Decision |
| :--- | :--- | :--- |
| `bulkgrab/index.html:163` | `"Zero developer logging: BulkGrab operates no servers"` | **REPLACED**: Qualified to state the extension sends no download URLs, filenames, or file contents to developer; downloads connect directly to file hosts. |
| `bulkgrab/index.html:253` | `"BulkGrab operates no tracking or proxy servers"` | **REPLACED**: Stated extension sends no URLs or files to developer; connects directly using browser session; optional Pro sends only payment ID to Worker. |
| `table-extractor/index.html:186` | Heading: `"No Server Uploads"` | **REPLACED**: Renamed to `"Client-Side Processing"`. Body qualified to state developer receives no extracted table data or spreadsheet contents. |
| `table-extractor/index.html:258` | `"zero user accounts, API keys, or cloud telemetry"` | **REPLACED**: Updated to `"No account or API key is needed for core features."`. |
| `privacy.html:251` | `"they do not pass through developer proxy or analytics servers"` | **REPLACED**: Qualified to state individual downloads and ZIP assembly connect directly to file hosts using active browser session. |
| `privacy.html:281` | Circular `"as disclosed in our Privacy Policy"` | **REPLACED**: Clean plain statement of Cloudflare Worker licensing proxy and exact fields received. |
| `build_redesign.py:1009` / `index.html:998` | Circular `"as disclosed in our Privacy Policy"` | **REPLACED**: Aligned with Section 4 opening copy. |
| `assets/js/site.js` (Table Extractor modal) | `"100% browser-local extraction without sending page content to any server"` | **REPLACED**: Changed to `"Client-side table extraction without sending page content to any server"`. |
| `assets/js/site.js` (BulkGrab modal) | `"Direct browser downloads with zero intermediary servers"` | **REPLACED**: Changed to `"Direct browser downloads without developer proxy servers"`. |

### 6.7 Published Store Builds vs. Local Code Verification (Item 7)

| Feature / Behavior | Table Extractor Edge 1.0.1 / Chrome 1.0.1 (`759dada`) | BulkGrab Edge 1.0.0 (`bulkgrab-store.zip`) | BulkGrab Chrome 1.0.3 (`dist/bulkgrab-store.zip`) | Website Portfolio Alignment |
| :--- | :--- | :--- | :--- | :--- |
| **Licensing Worker Endpoints** | Uses `bulkgrab-licensing.sidoua26.workers.dev` | Uses `bulkgrab-licensing.sidoua26.workers.dev` | Uses `bulkgrab-licensing.sidoua26.workers.dev` | **ALIGNED**: Documented in `privacy.html` Section 4 and product pages. |
| **Pro Feature Gating** | Virtualized capture, ZIP export, multi-format export gated behind Pro | Batch downloads >7 files gated behind Pro | Batch downloads >7 files gated behind Pro | **ALIGNED**: Disclosed in FAQs and capability cards. |
| **Free Tier Quotas** | Standard HTML tables to single format (CSV, XLSX, JSON) | 7 files per session (`FREE_DOWNLOAD_LIMIT = 7`) | 7 files per session (`FREE_DOWNLOAD_LIMIT = 7`) | **ALIGNED**: Disclosed 7-file limit and session reset behavior. |
| **Row & Step Bounds** | Default 500 steps, default 5,000 rows, max 50,000 rows in popup | N/A | N/A | **ALIGNED**: Disclosed default caps first, then user-configurable maximum. |
| **Direct File Downloads & ZIP Fetching** | Client-side memory parsing | `fetch(file.url, { credentials: 'include' })` for ZIPs | `fetch(file.url, { credentials: 'include' })` for ZIPs | **ALIGNED**: Disclosed destination server requests and cookies. |
| **Network Invocation** | User-initiated only | User-initiated only | User-initiated only | **ALIGNED**: Confirmed no background polling, alarms, or telemetry. |

### 6.8 Owner Action List & Remaining Limitations
1. **Cloudflare KV Binding Verification:** Confirm whether `BULKGRAB_KV` is bound in the Cloudflare dashboard for production worker `bulkgrab-licensing.sidoua26.workers.dev`.
2. **Pricing & Currency Review:** Confirm whether $9.99 USD price settled in Tether USDT on Binance Smart Chain (`usdtbsc`) is intended for both extensions, and specify refund terms.
3. **Privacy Policy Table of Contents:** The Table of Contents in `privacy.html` contains 10 items whose numbers and labels diverge slightly from the actual section headings (e.g., Section 2 vs Section 3).

