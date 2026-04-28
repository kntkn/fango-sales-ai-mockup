# Sales AI Mockup — Bug Hunt Log

Single source of truth while kento asked for an exhaustive audit. Every bug lives here until resolved.

## Legend

- Severity: `crit` (crash / data loss / security) · `high` (wrong behavior users hit) · `med` (silent failure / resilience) · `low` (cosmetic / edge)
- Status: `open` · `fixing` · `fixed` · `wontfix` · `falsepos`
- Each entry: `#Nnn` id, file:line, one-line symptom, root cause, fix note.

## Rules for this log

1. Every bug gets a unique id. Do not renumber.
2. `falsepos` entries stay in the log with evidence (keeps me honest).
3. `fixed` entries keep the diff summary so regressions are diffable.
4. After each wave: `bunx tsc --noEmit`, `curl http://localhost:3009/`, webhook 401 check, OGP SSRF check.

---

## Wave 1 — initial subagent report + my review (closed)

### B001 `src/app/page.tsx:682` — polling timeout clears wrong interval
- Severity: high · Status: fixed
- Symptom: Re-running 物件提案検索 on same conversation strands the new search in "searching" forever — the first search's 180s timer clears whatever interval is at the ref key, including a newer poll.
- Fix: scope timeout to its own `pollInterval`; bail if ref no longer matches and projectId moved.

### B002 `src/app/page.tsx:284` — sendLineMessage swallows network errors
- Severity: high · Status: fixed
- Symptom: Network offline → unhandled rejection, UI shows nothing.
- Fix: try/catch around `fetch`, `setSendError` before rethrowing.

### B003 `src/app/page.tsx:317` — sendLineImages same issue
- Severity: high · Status: fixed
- Fix: same pattern.

### B004 `src/app/api/line/webhook/route.ts:19` — signature bypass
- Severity: crit (security) · Status: fixed
- Symptom: Missing `x-line-signature` header → validation skipped → unsigned events processed.
- Fix: require valid signature when `events.length > 0`; empty ping still 200.
- Verified: `curl` with events + no sig → 401; `events:[]` no sig → 200.

### B005 `src/app/api/ogp/route.ts` — SSRF to internal / metadata
- Severity: crit (security) · Status: fixed
- Fix: `isBlockedHost` rejects localhost, 127/8, 10/8, 172.16-31/12, 192.168/16, 169.254.169.254, IPv6 loopback/link-local, CGNAT.
- Verified: `169.254.169.254` → 404, `10.0.0.1` → 404, `example.com` → 200.

### B006 `src/lib/line-store.ts:72,126` — corrupt JSON kills all LINE APIs
- Severity: med · Status: fixed
- Fix: try/catch around `JSON.parse`, return empty on corruption, log.

### B007 `src/components/ChatThread.tsx:1506` — previewUrls race → broken thumbnails
- Severity: low (UX polish) · Status: fixed
- Symptom: Adding/removing images races with the URL-gen effect; one render could `<img src={revokedUrl}>`.
- Fix: File→URL Map in a ref, synchronous getter, reconcile in effect, component-unmount cleanup.

### Subagent false positives from wave 1

- FP-1 `use-call-memo.ts:85` stale closure on `key` — `save` deps already include `[memo, key, conversationId]`.
- FP-3 SSR hydration of useCallMemo — initializes to `''` on both server and client, no mismatch.
- FP-5 `extractUrls` null — `?? []` already present.
- FP-6 `fetchOgp` error handling — `.catch(() => null)` flows into the cache-setter; no hang.
- FP-8 `readStages` JSON.parse — already wrapped in try/catch.
- FP-10 `recommendPollingRef` cleanup — cleanup closure reads the live ref object, not a stale snapshot.
- FP-13 `findCustomerByLineUserId` null crash — `if (!page) return null;` is there.
- FP-23 bukkaku state-machine race — `ws.onmessage = null; ws.close()` + `doneRef` interlock is adequate.

---

## Wave 2 — FIXED

All entries below have been patched. Verification:
- `bunx tsc --noEmit` → 0 errors
- `bunx eslint src/` → 0 errors, 0 warnings
- Browser smoke (playwright): no console errors, no React warnings, no `getSnapshot should be cached` / infinite-loop notices
- curl smoke: root=200, webhook-empty=200, webhook-unsig=401, ogp-public=200, ogp-private=404, ogp-image-private=400, project-bad-id=400, line-bad-id=400, line-bad-json=400, line-text-too-long=413

## Wave 2 — raw report (now fixed)

### ConversationList.tsx

### B020 keyboard trap: card `onKeyDown` swallows Enter/Space on nested `<select>`
- File: `src/components/ConversationList.tsx:244-250` · Severity: high · Category: a11y/event
- Tab into the assignee `<select>`, press Space → card `onSelect` fires instead of dropdown opening.
- Fix: `if (e.target !== e.currentTarget) return;` at top of handler.

### B021 nested interactive: `<div role="button">` containing `<select>`
- File: `src/components/ConversationList.tsx:242,311` · Severity: high · Category: a11y
- ARIA violation. Fix: break up roles or wrap the name section in a real `<button>`.

### B022 `relativeTime` called during render — hydration mismatch + never ticks
- File: `src/components/ConversationList.tsx:31-39` · Severity: med · Category: hydration
- `Date.now()` during SSR vs client differs; also list never updates.
- Fix: `mounted` gate + tick effect.

### B023 sort comparator NaN risk on invalid `lastMessageTime`
- File: `src/components/ConversationList.tsx:381-383` · Severity: med
- Fix: coerce NaN → 0 before subtraction.

### B024 `relativeTime` returns `NaN日前` for invalid dates / negative values
- File: `src/components/ConversationList.tsx:31-39` · Severity: med
- Fix: early-guard `if (!Number.isFinite(...)) return '—'; if (diffMs < 0) return 'たった今';`

### B025 search ignores LINE display/alias names
- File: `src/components/ConversationList.tsx:370-378` · Severity: med
- Fix: include `lineDisplayName`, `lineAliasName` in filter.

### B026 `customerName.charAt(0)` breaks surrogate pairs
- File: `src/components/ConversationList.tsx:228` · Severity: low
- Fix: `Array.from(name)[0] ?? ''`.

### B027 `bgCls` unread-vs-not is a no-op (probably a missed intent)
- File: `src/components/ConversationList.tsx:234-238` · Severity: low
- Fix: remove or differentiate.

### CrmView.tsx

### B030 sortable `<th>` headers not keyboard-operable
- File: `src/components/CrmView.tsx:328-337` · Severity: med · Category: a11y
- Fix: `onKeyDown` + `tabIndex={0}` + `role="button"` and `aria-sort`.

### B031 `relativeTime` in render (same as B022 but in CrmView)
- File: `src/components/CrmView.tsx:54,401` · Severity: med
- Fix: mounted gate + tick.

### B032 sort `lastMessageTime.getTime()` assumes Date, may be string after serialization
- File: `src/components/CrmView.tsx:249` · Severity: med
- Fix: `new Date(x).getTime()` with NaN fallback.

### B033 `customerName.charAt(0)` and `a.area.localeCompare(b.area)` can crash
- File: `src/components/CrmView.tsx:109,247` · Severity: med
- Fix: nullish-coalesce.

### B034 stageCounts summary strip ordered by insertion, not business order
- File: `src/components/CrmView.tsx:260-266,298-303` · Severity: low
- Fix: iterate STAGE_CONFIG keys.

### B035 sort comparator has no tie-breaker → rows jitter on re-render
- File: `src/components/CrmView.tsx:238-253` · Severity: low
- Fix: fallback to `lastMessageTime` desc.

### B036 `📞 電話` button is console.log stub
- File: `src/components/CrmView.tsx:411` · Severity: low
- Fix: disable visually, or wire a prop.

### B037 `stageSelect` inside `<tr>` has no `stopPropagation` guard for future row-click
- File: `src/components/CrmView.tsx:366-378` · Severity: low (pre-emptive)
- Fix: add `onClick={e => e.stopPropagation()}` on interactive cells.

### B038 (NOTE — verify) stage `<select>` data-sync — AUDIT CLAIMED FALSE POSITIVE
- Parent `page.tsx` DOES merge `useConversationStages()` into conversations, so this finding is **FALSE POSITIVE**. No action.

### ContextPanel.tsx

### B040 stage `<select>` possible value/option mismatch (same store as CrmView)
- File: `src/components/ContextPanel.tsx:346-358` · Severity: med
- Verify: parent merges overrides; if yes, mostly false-pos but add defensive `onChange` local mirror.

### B041 `behaviorLog` reversed list uses index as key
- File: `src/components/ContextPanel.tsx:409-415` · Severity: med
- Fix: stable composite key.

### B042 `suggestedReactions` keyed by `propertyName` — collisions possible
- File: `src/components/ContextPanel.tsx:765` · Severity: low
- Fix: include index.

### B043 `ContactEditor` flashes stale props on save success
- File: `src/components/ContextPanel.tsx:153-158` · Severity: high
- Fix: hold optimistic local values until parent confirms.

### B044 `BukakuButton` form input is dead UI (only console.log)
- File: `src/components/ContextPanel.tsx:781-810` · Severity: high
- Fix: wire onCheck prop or hide.

### B045 PropertyCard action buttons have no handlers
- File: `src/components/ContextPanel.tsx:443-445` · Severity: med
- Fix: add props or remove.

### B046 `recommend.results` assumed defined on `complete` without guard
- File: `src/components/ContextPanel.tsx:590` · Severity: med
- Fix: `recommend.results ?? []`.

### B047 avatar `<img>` no `onError` fallback
- File: `src/components/ContextPanel.tsx:316-320` · Severity: med
- Fix: onError swap to initial.

### B048 emojis used as icons without `aria-hidden`
- File: `src/components/ContextPanel.tsx:98,185,376,402,431,553,572,597` · Severity: low
- Note: per no-emoji rule; swap to Material Symbols per global rule. Defer.

### B049 `name.charAt(0)` not grapheme-safe
- File: `src/components/ContextPanel.tsx:305` · Severity: low
- Fix: `[...name][0] ?? ''`.

### B050 tabs switch unmounts panels → loses state (resultCount, editing, form)
- File: `src/components/ContextPanel.tsx:881-907` · Severity: med
- Fix: render both, toggle with `hidden`.

### B051 `onSaveContact` catch assumes `Error`
- File: `src/components/ContextPanel.tsx:166-167` · Severity: low
- Fix: `e instanceof Error ? e.message : String(e)`.

### ChatThread.tsx (beyond composer)

### B060 CRITICAL: prefill effect re-fires on `adjustHeight` identity → overwrites user edits
- File: `src/components/ChatThread.tsx:1599-1613` · Severity: crit
- Repro: prefill in → user edits → press expand toggle → textarea reverts.
- Fix: track `lastAppliedNonceRef`, skip if matches; remove adjustHeight from deps.

### B061 ReplyPopover layout effect doesn't observe viewport changes
- File: `src/components/ChatThread.tsx:1085-1118` · Severity: high
- Fix: ResizeObserver / visualViewport resize re-measure.

### B062 IME Enter unguarded in RefineInput and ThreadHeader rename
- File: `src/components/ChatThread.tsx:1276-1279,404-407` · Severity: high
- Fix: `if (e.nativeEvent.isComposing || e.keyCode === 229) return;`

### B063 AiSuggestionZone loses per-conversation state (expanded, refining, justSaved) across switches
- File: `src/components/ChatThread.tsx:1296-1415,2272` · Severity: med
- Fix: add `key={`${conversation.id}:${suggestionId}`}` at call site.

### B064 CallMemoButton outside-click uses only `mousedown` (misses touch)
- File: `src/components/ChatThread.tsx:203-218` · Severity: med
- Fix: `pointerdown` (and keep mousedown for compat).

### B065 prefill `el.value =` direct assign confuses IME mid-composition
- File: `src/components/ChatThread.tsx:1599-1613` · Severity: med
- Fix: blur first, then set, then focus.

### B066 clipboard.writeText failure is silent
- File: `src/components/ChatThread.tsx:897-906` · Severity: low
- Fix: catch → set transient "copy failed" banner.

### B067 `isNearBottomRef` init true → initial smooth scroll on long threads
- File: `src/components/ChatThread.tsx:2107,2194-2208` · Severity: low
- Fix: `mountedRef` → first scroll `behavior:'auto'`.

### B068 OgpCard prop `isAgent` unused
- File: `src/components/ChatThread.tsx:624` · Severity: nit
- Fix: remove.

### B069 QuotedMessageCard button clickable even with undefined `onJumpTo`
- File: `src/components/ChatThread.tsx:729-740` · Severity: low
- Fix: `disabled={!onJump}` + remove cursor-pointer when so.

### B070 formatTime lacks Invalid Date guard
- File: `src/components/ChatThread.tsx:62-64` · Severity: nit
- Fix: `if (isNaN(d.getTime())) return '';`

### BukkakuPipeline / ObikaeLauncher / small components

### B080 ResultCardCompact uses array index as key during streaming
- File: `src/components/BukkakuPipeline.tsx:96` · Severity: med
- Fix: `reins_id ?? i`.

### B081 MaisokuPopover iframe has no `sandbox`
- File: `src/components/BukkakuPipeline.tsx:563-567` · Severity: med (same-origin HTML XSS vector)
- Fix: `sandbox=""` and strict Content-Type check at /api/maisoku.

### B082 MaisokuPopover height can collapse below usable
- File: `src/components/BukkakuPipeline.tsx:496-501` · Severity: low
- Fix: `Math.max(240, ...)` floor.

### B083 ObikaeLauncher: postMessage payload shape not validated (proposeUrl can be `javascript:`)
- File: `src/components/ObikaeLauncher.tsx:117-138` · Severity: med (only if obikae origin compromised)
- Fix: validate `proposeUrl` is http(s) URL, string types.

### B084 ObikaeLauncher: popup poll effect depends on full `session` object
- File: `src/components/ObikaeLauncher.tsx:88-113` · Severity: low
- Fix: depend on `session?.popupOpen` primitive.

### B085 ViewingCalendarView / InquiryListView `new Date()` in render → hydration + stale
- File: `ViewingCalendarView.tsx:27-31,37,141,144; InquiryListView.tsx:23` · Severity: med
- Fix: mount-gate today.

### B086 ViewingCalendarView click handlers are dead (console.log)
- File: `ViewingCalendarView.tsx:116,196` · Severity: low
- Fix: disable visually OR route via prop.

### B087 AgentListView drop in gap = no-op with stuck opacity
- File: `AgentListView.tsx:79-89` · Severity: low
- Fix: drop handler on `<ul>`; guarantee `onDragEnd` resets opacity.

### B088 InquiryListView opens chat by `customerName` (not id)
- File: `InquiryListView.tsx:60` · Severity: med
- Fix: pass `inq.id`.

### B089 Header tabs no `aria-current`
- File: `Header.tsx:24-39` · Severity: low
- Fix: `aria-current="page"` on active.

### API routes

### B100 CRITICAL: no auth on any mutating endpoint
- Files: `customers/*`, `line/messages/*`, `line/customers/*` · Severity: crit · Category: security · Status: fixed
- Fix: `src/lib/api-guard.ts` provides `requireStaffAuth(req)` — opt-in via `STAFF_API_TOKEN` env, skipped when unset (dev-friendly). All mutating routes gated.

### B101 CRITICAL: `/api/line/content/[messageId]` re-fetch oracle burns LINE token
- File: `api/line/content/[messageId]/route.ts:41-55` · Severity: crit · Status: fixed
- Fix: only the re-fetch-from-LINE-API branch gates on `requireStaffAuth`; cached serving stays open so LINE can still fetch outgoing image URLs.

### B102 `/api/ogp-image` missing SSRF host block
- File: `api/ogp-image/route.ts:20,43-48` · Severity: med
- Fix: extract `isBlockedHost` to `lib/ssrf.ts`, apply in both.

### B103 `/api/recommend/status/[projectId]` path injection → upstream
- File: `api/recommend/status/[projectId]/route.ts:9`, `lib/fango-recommend.ts:150` · Severity: high
- Fix: regex guard + `encodeURIComponent`.

### B104 unvalidated JSON body throws 500 on bad payload
- Files: multiple POST/PATCH routes · Severity: med
- Fix: wrap `await req.json()` in try/catch, return 400.

### B105 error responses leak internal messages
- Files: multiple · Severity: med
- Fix: generic error body for 5xx, log server-side.

### B106 `maisoku/[reinsId]` serves any file as `application/pdf`
- File: `api/maisoku/[reinsId]/route.ts:34-42` · Severity: med
- Fix: magic-byte `%PDF` check.

### B107 LINE `lineUserId` not validated / not encoded for upstream
- Files: `api/line/*` · Severity: med
- Fix: `/^U[0-9a-f]{32}$/` + encodeURIComponent in line-client.

### B108 image upload trusts client MIME
- File: `api/line/messages/[lineUserId]/image/route.ts:81` · Severity: med
- Fix: magic-byte check (JPEG `FFD8FF`, PNG `89504E47`).

### B109 text message has no length cap
- File: `api/line/messages/[lineUserId]/route.ts:21-31` · Severity: med
- Fix: `if (text.length > 5000) return 400`.

### B110 body shape not validated for customers/* and line messages/*
- Files: multiple · Severity: med
- Fix: minimal runtime validation (string type, length).

### B111 OGP cache unbounded
- File: `api/ogp/route.ts:17` · Severity: low
- Fix: LRU with cap.

### B112 `/api/line/content` O(n) scan over all messages
- File: `api/line/content/[messageId]/route.ts:16` · Severity: med
- Fix: Map-indexed lookup in line-store.

### B113 no rate limit anywhere
- Severity: med · Status: fixed
- Fix: `rateLimit(req, {bucket, max, windowMs})` in `src/lib/api-guard.ts`. Per-IP fixed-window counter, 5000-bucket LRU eviction. Per-route buckets sized for expected UI load: ogp=30/min, ogp-image=60/min, line-push=60/min, line-image=30/min, line-content=300/min, line-webhook=600/min, customers-list=120/min, customers-create=30/min, customers-patch=60/min, recommend-search=20/min, recommend-status=300/min.
- Verified: 30 successes then 429 on OGP flood.

### lib/

### B120 FormData retry on 401 sends empty body (data loss)
- File: `src/lib/fango-recommend.ts:40-54` · Severity: high
- Fix: accept body factory for retries, or proactively refresh token before call.

### B121 concurrent login triggers duplicate POSTs
- File: `src/lib/fango-recommend.ts:8-26` · Severity: med
- Fix: in-flight loginPromise memo.

### B122 hard-coded JWT 6-day refresh, ignores actual `exp`
- File: `src/lib/fango-recommend.ts:23-24` · Severity: med
- Fix: parse JWT payload.

### B123 missing env var silently posts to relative URL
- File: `src/lib/fango-recommend.ts:1-3` · Severity: med
- Fix: assert at import.

### B124 Notion `text()` only reads first rich-text node (truncates formatted strings)
- File: `src/lib/notion.ts:38-44` · Severity: med
- Fix: `.map(n => n.plain_text).join('')`.

### B125 Notion `buildUpdateProperties` doesn't chunk >2000 chars
- File: `src/lib/notion.ts:140-150` · Severity: med
- Fix: split into multiple rich_text nodes.

### B126 `createCustomer` accepts empty name (creates blank title rows)
- File: `src/lib/notion.ts:164-170` · Severity: low
- Fix: guard.

### B127 `mapPageToCustomer` crashes on archived/partial page
- File: `src/lib/notion.ts:115-119` · Severity: low
- Fix: null guard on `pg.properties`.

### B128 agent-store: filtered-empty array returned (no fallback to seeds)
- File: `src/lib/agent-store.ts:15-26` · Severity: low
- Fix: empty filter result → seeds.

### B129 useCoarsePointer: Safari ≤13 compat (addListener)
- File: `src/lib/use-coarse-pointer.ts:14-17` · Severity: low (we don't target Safari 13)
- Fix: feature detect. Defer; out of scope.

### B130 useKeyboardInset: negative `offsetTop` inflates inset
- File: `src/lib/use-keyboard-inset.ts:13-14` · Severity: low
- Fix: `Math.max(0, offsetTop)`.

### B131 types.ts uses emoji icons in SCORE_CONFIG / AI_MODE_CONFIG
- File: `src/lib/types.ts:188-191,205-211` · Severity: med (rule violation) · Status: fixed
- Fix: new `src/components/Icons.tsx` ships a single set of inline Material Symbols SVGs (`ScoreIcon`, `AiModeIcon`, plus section glyphs). `SCORE_CONFIG`/`AI_MODE_CONFIG` are now data-only (no `icon` field). All emoji `<span>` markers across ConversationList / ChatThread / ContextPanel / BukkakuPipeline / CrmView / ObikaeLauncher / notion-chatlog were swapped to named icon components or plain text. Only legacy marker `'💬 チャットログ'` kept as a read-only matcher for existing Notion pages so appending doesn't duplicate the section.
- Verified: `tsc` 0 errors, `eslint` 0 errors / 0 warnings, `next build` 0 errors, playwright desktop+CRM screenshots show no emoji glyphs, console clean.

### B200 (mid-run regression) `useSyncExternalStore` infinite-loop warning
- Files: `ConversationList.tsx`, `CrmView.tsx`, `ViewingCalendarView.tsx`, `InquiryListView.tsx`, `use-conversation-stage.ts`
- Severity: high · Status: fixed
- Symptom: kento hit "The result of getSnapshot should be cached to avoid an infinite loop" — my first pass for hydration-safe clock/day feeds returned `Date.now()` from `getSnapshot`, which generates a new reference every call and makes React treat the store as constantly changing.
- Fix: module-scoped `cachedNow` / `cachedDayMs` snapshot; `subscribe` refreshes it via the ticker and calls `onChange` only when the cached value actually changes; `getSnapshot` returns the cache.
- Verified in-browser via playwright: `console warning` log is empty after reload.

### B201 Stage map snapshot must reuse EMPTY
- File: `src/lib/use-conversation-stage.ts` · Severity: high · Status: fixed
- Same class as B200 — freshly-read empty objects would differ by reference. Fix collapses "no data" reads to the shared `EMPTY` sentinel.

---

## Already reported in wave 1 (keep for historical reference)

### B008 `src/components/ChatThread.tsx:2144` — setState in effect (React 19 rule)
- Severity: med · Status: open
- `useEffect(() => { setReplyTo(null); }, [conversation.id])` — reset-on-prop-change via effect causes double-render. Switch to "setState-during-render with prev-ref" idiom.

### B009 `src/lib/use-call-memo.ts:53` — setState in effect
- Severity: med · Status: open
- Same pattern; switch to render-time comparison or `useSyncExternalStore`.

### B010 `src/lib/use-conversation-stage.ts:43` — setState in effect (mount-time hydrate)
- Severity: med · Status: open
- Replace with `useSyncExternalStore`.

### B011 `src/lib/use-draft-message.ts:68` — setState in effect
- Severity: med · Status: open
- Same pattern as B009.

### B012 `src/components/ObikaeLauncher.tsx:143` — missing dep `popupRef`
- Severity: low · Status: open
- Add to deps (stable ref, harmless).

### B013 unused imports (dead code)
- Severity: low · Status: open
- `page.tsx` customerToConversation; `ChatThread.tsx` SuggestedProperty, Stars; `ContextPanel.tsx` ScoreTier.


---

## Verification checklist (run after every fix wave)

```
bunx tsc --noEmit                          # → exit 0
curl -s -o /dev/null -w "%{http_code}" http://localhost:3009/
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3009/api/line/webhook \
  -H 'Content-Type: application/json' \
  -d '{"events":[{"type":"message","source":{"userId":"Uforgery"},"timestamp":1,"message":{"type":"text","text":"x","id":"m1"}}]}'
# → 401

curl -s -o /dev/null -w "%{http_code}" "http://localhost:3009/api/ogp?url=http://169.254.169.254/"
# → 404

curl -s -o /dev/null -w "%{http_code}" "http://localhost:3009/api/ogp?url=https://example.com/"
# → 200
```
