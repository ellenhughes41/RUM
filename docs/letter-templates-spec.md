# Letter Templates — Developer Handover Spec

Status: prototype behavior documented as of 2026-08-20.
Scope: the Letter Templates module (`/letter-templates`) in the PA Co-Pilot admin app.

This document separates three things that are easy to conflate:

- **Confirmed rules** — written down by the product owner. Build these.
- **Inferred behavior** — choices made during prototyping to make the screens work. Verify before building.
- **Open questions** — decisions still needed before the production data model is finalized.

---

## 1. Overview

A **letter template** is the authored body of an outbound member letter, scoped to a
**trigger** (the case event that causes a letter to be sent) and to one or more **clinical
policies**. The body is HTML with `{{merge_variable}}` tokens that resolve against the case
at send time.

There are three triggers:

| Trigger | Fires when |
| --- | --- |
| `Denied` | A case reaches a denial decision |
| `RFI Requested` | A case requests additional information |
| `Closed – RFI Expired` | An RFI window lapses with no response |

**Selection at send time** — given a trigger and the case's clinical policy:

1. The live template for that exact `(trigger, policy)` pair, if one exists.
2. Otherwise the live `(trigger, "All policies")` template.
3. Otherwise no letter — which the *all-policies invariant* (§3.9) exists to prevent.

A specific policy always beats "All policies".

---

## 2. Data shape (as prototyped)

Defined by the `LetterTemplate` interface in `src/hooks/use-letter-templates.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Client-generated (`t-<timestamp>`) in the prototype |
| `name` | string | Free text, not unique-constrained |
| `trigger` | enum | `Denied` \| `RFI Requested` \| `Closed – RFI Expired` |
| `policy` | string | **See warning below** — comma-separated, not a relation |
| `body` | string | HTML with `{{token}}` merge variables inline |
| `effectiveDate` | `YYYY-MM-DD` | Required |
| `terminationDate` | `YYYY-MM-DD` \| undefined | Absent = open-ended |
| `published` | boolean | One-way; there is no unpublish |
| `publishedAt` | ISO datetime \| undefined | Audit stamp, set on publish |
| `predecessorId` | string \| undefined | The template this one supersedes |
| `createdAt` | `YYYY-MM-DD` | — |

Two things the production model must change:

- **Status is derived, never stored.** There is no `status` column. It is computed from
  `published` + the two dates on every read (§3.1). Storing it would let it go stale as
  dates roll over — the transition from Inactive to Active happens with no write event.
- **`policy` is a comma-separated string.** The UI is a required multi-select, but the value
  is flattened to `"Policy A, Policy B"` for storage. This is a prototype shortcut. Production
  needs a join table (`template_policies`), and the sentinel value `"All policies"` should
  become an explicit boolean/enum on the template rather than a magic string — the current
  code compares against the literal `ALL_POLICIES` constant in several places.

---

## 3. Confirmed business rules

These were specified in writing by the product owner.

### 3.1 Derived status

Never a manual field. Boundary days are **inclusive**.

```text
Draft    = NOT published
Active   = published AND effective_date <= today
                    AND (termination_date IS NULL OR today <= termination_date)
Inactive = published AND (today < effective_date OR today > termination_date)
```

Consequence, and it is intentional: publishing with a **future** effective date produces a
template that is *published but Inactive*. It becomes Active on its own when the date
arrives, with no write and no user action. Status must be displayed consistently everywhere
it appears.

### 3.2 Publish is one-way

There is no unpublish. "Save Draft" keeps a template in Draft. Once published, the only way
forward is to terminate it or supersede it.

### 3.3 Edit-by-duplicate

A published template cannot be edited in place. The path is **Duplicate → edit the copy →
Publish the copy**.

### 3.4 Predecessor auto-termination

When a duplicate is published, its predecessor's `termination_date` is automatically set to
`new effective_date − 1 day`. The predecessor stays Active through that day; the successor
takes over the next. The handoff is contiguous — no gap, no overlap.

```text
predecessor  |=================|
successor                      |==================>
                     eff-1 ----^ ^---- new effective date
```

### 3.5 Overlap is blocked

Publishing is rejected if two templates for the same `(trigger, policy)` would have
overlapping `[effective, termination]` windows. The user sees a clear validation error
naming the conflicting template and its date range. This is a hard block, not a warning, and
not an auto-resolve — the only automatic resolution is the predecessor auto-termination in §3.4.

### 3.6 Date edit rules on published templates

- **Termination date** — always editable.
- **Effective date** — editable only while still in the future (`effective_date > today`).
  Once in effect, permanently locked.

### 3.7 Row actions

Landing-page kebab menu: **Edit**, **Duplicate**, **Terminate**, **View History**.
Terminate sets a termination date. There is **never a hard delete** of a published template.

### 3.8 View History

Read-only. Shows the chain for a `(trigger, policy)`, each entry with its effective and
termination range, plus a compare/diff view between any two selected entries.

### 3.9 All-policies invariant

Every trigger must always have a live "All policies" template, so no case can resolve to
"no letter".

- Terminate is blocked if it would leave a trigger without a live All-policies template.
- The landing page surfaces a warning banner whenever any trigger currently lacks one.
- The error message must explain *why* the action was blocked.

### 3.10 Resolution order

As described in §1: exact policy match beats All policies.

### 3.11 Policy-lineage auto-relink

When a clinical policy is duplicated into a successor version, any letter template scoped to
the **predecessor** policy auto-relinks to the **successor** policy. This is automatic, with
a toast notice (`"3 templates re-linked to Ozempic PA v2"`), not a manual migration step.

---

## 4. Inferred behavior — verify before building

None of the following was specified. Each is a prototyping decision that happens to work for
the demo; treat every one as a question in disguise.

**4.1 Which fields lock on a published template.**
The prototype disables *name, trigger, policy, and body* whenever `published === true`
(`contentLocked = isPublished` in the editor). "Editing is done via Duplicate" was stated;
the exact lock set was not. Note that termination date deliberately stays editable, per §3.6.

**4.2 Duplicate defaults.**
`duplicateTemplate` copies the source and then applies: name + `" (Copy)"`,
`published: false`, `publishedAt` cleared, `terminationDate` cleared,
`effectiveDate = tomorrow`, `createdAt = today`, and
`predecessorId = source.published ? source.id : source.predecessorId` (so duplicating a
draft chains to the nearest published ancestor rather than to the draft).

**4.3 Trigger and policy stay editable on the duplicate.**
Because the copy is a Draft, every field unlocks — including trigger and policy. A user can
therefore retarget a duplicate to a different policy. This is almost certainly the highest-risk
inference in the module: it silently detaches the copy from its predecessor's overlap group
and from its history (see 4.6). See open question 5.1.

**4.4 Overlap ignores drafts.**
`findOverlaps` only considers templates where `published === true`. Two drafts may overlap
freely; the conflict surfaces at publish time. This is defensible (drafts are not live) but
means a user can build a doomed template and only learn at the last step.

**4.5 Extra predecessor-ordering validation.**
Publish is additionally rejected if the successor's effective date is not after the
predecessor's effective date — otherwise the auto-termination in §3.4 would compute a
termination date earlier than the predecessor's own start. This guard was added during
implementation; it was not requested.

**4.6 Lineage is derived by grouping, not by the predecessor edge.**
`getLineage` returns *every* template sharing the same `(trigger, policy)`, sorted by
effective date — it does **not** walk `predecessorId`. The spec's wording ("predecessor chain
for a (Trigger, Policy)") supports either reading, and the two diverge in practice: a
retargeted duplicate vanishes from its origin's history, while unrelated templates that
happen to share a trigger and policy appear in it. See open question 5.2.

**4.7 All-policies guard also runs on publish.**
The spec named Terminate. The prototype also applies the guard on publish, because
publishing a successor auto-terminates a predecessor (§3.4) and could otherwise remove the
last live All-policies template as a side effect. This looks like the intended spirit of the
rule, but confirm.

**4.8 Persistence and enforcement are prototype-grade.**
State lives in `localStorage` behind a versioned key, mutated through a module-level array
and `useSyncExternalStore`. There is no server, no concurrency control, and no audit log
beyond `publishedAt`. "No unpublish" is enforced only by the absence of a button — nothing
in the store prevents writing `published: false`. Production needs server-side enforcement
of every rule in §3; none of them can live in the client.

**4.9 Multi-select policy flattening.**
Selecting "All policies" clears all specific selections, and selecting a specific policy
removes "All policies" — the two are mutually exclusive in the UI. That exclusivity rule is
enforced only in the editor component, not in the store.

---

## 5. Open questions for the product owner

**5.1 Are trigger and policy frozen on a duplicate?**
If frozen, Duplicate means strictly "new version of this letter" and lineage stays coherent.
If editable, Duplicate doubles as "start a new template from this one" — convenient, but a
retargeted copy keeps a `predecessorId` pointing at a template it will never supersede, and
the auto-termination in §3.4 would then terminate an unrelated predecessor on publish.
*Recommendation: freeze both, and add a separate "Save as new template" action if the
copy-as-starting-point use case is real.*

**5.2 Should history follow the predecessor edge or the (trigger, policy) group?**
The edge is precise and survives retargeting; the group is what a user probably expects to
see when asking "what letters have ever applied here?". These may be two different views
rather than one. Resolving 5.1 makes this largely moot.

**5.3 Should "Inactive" be split?**
Today `Inactive` conflates *not yet effective* (scheduled, future) with *expired* (past). They
are operationally very different — one needs monitoring, the other is archive. Consider
`Scheduled` / `Active` / `Expired` alongside `Draft`. This is a display-layer change only;
the underlying dates already distinguish them.

**5.4 Multi-policy templates and overlap.**
A template can now target several policies. Is the overlap window evaluated per individual
policy, or against the policy set as a whole? Per-policy is almost certainly correct — two
templates sharing one of five policies do conflict for that policy — but the prototype
compares the flattened string, so `"A, B"` and `"B, C"` currently do **not** register as
overlapping even though both would resolve for policy B. This is a real bug under the
current data shape and disappears once policies become a join table.

**5.5 Can a Draft be deleted?**
The no-hard-delete rule is explicit for published templates. Drafts have no delete action at
all today, so an abandoned draft is permanent clutter. Confirm whether drafts are hard-deletable.

**5.6 Is Resolution Preview deferred or dropped?**
It was specified, built, and then removed at the user's request. The resolver logic still
exists in the store (`resolveTemplate`) with no UI attached. Confirm whether it returns.

**5.7 Required variables per trigger.**
Discussed but never specified. See §6.

---

## 6. Merge variables

The catalog is **fixed and system-defined** — a hardcoded constant in the editor. Users cannot
create, edit, or delete variables; the Variable Library panel is insert-only (click a variable,
its `{{token}}` is inserted at the cursor). 18 tokens in two groups.

### Case & Member

| Token | Label | Type |
| --- | --- | --- |
| `member_name` | Member name | scalar |
| `member_id` | Member ID | scalar |
| `case_id` | Case ID | scalar |
| `drug_name` | Drug name | scalar |
| `ndc` | NDC | scalar |
| `authorization_type` | Authorization type | scalar |
| `decision_reason` | Decision reason | scalar |
| `case_priority` | Case priority | scalar |
| `due_date` | Due date | scalar |

### Policy & Decision

| Token | Label | Type |
| --- | --- | --- |
| `policy_name` | Policy name | scalar |
| `policy_number` | Policy number | scalar |
| `denial_criteria` | Denial criteria (failed rules) | rule_list |
| `rfi_criteria` | RFI criteria (missing rules) | rule_list |
| `denial_rfi_criteria` | Both failed and missing rules | rule_list |
| `denial_evidence` | Denial evidence | scalar |
| `authorization_length` | Authorization length | scalar |
| `policy_max_auth` | Policy max authorization | scalar |
| `decision_date` | Decision date | scalar |

**Two value types.** `scalar` resolves to a plain string and should be HTML-escaped.
`rule_list` resolves to a nested HTML bulleted list built from the case's rule-evaluation
results (parent rule as the bullet, sub-rules as sub-bullets) and must **not** be escaped.

**Explicitly excluded**, and worth recording so nobody re-adds them: `appeal_deadline`,
`appeal_instructions`, `member_address`, `prescriber_name`. Appeal text is authored directly
in the body; addresses and prescriber have no data source yet.

**Not specified — needs a decision.** Nothing was ever stated about which variables are
*required* for which trigger. The natural model is that requiredness is a property of the
**trigger**, not the template: a `Denied` letter arguably must contain `denial_criteria`,
while an `RFI Requested` letter must contain `rfi_criteria`. That implies a
`trigger → variable` applicability table (with an `applicability` value of
`required` / `optional` / `not_applicable`) and publish-time validation that scans the body
for the required tokens. Also undecided: the `on_empty` behavior for `rule_list` tokens — if a
Denied case somehow has zero failed rules, does the letter render nothing, a placeholder, or
fail generation?

**Substitution.** Currently a literal `{{token}}` string replacement. A production resolver
should tolerate whitespace (`{{ token }}`), define behavior for unknown tokens (they
currently pass through into the rendered output verbatim), and be shared by the on-screen
preview, the PDF export, and the real send path — today the preview and PDF both re-implement
against the sample-value map.

---

## 7. Prototype file map

| Path | Contains |
| --- | --- |
| `src/hooks/use-letter-templates.ts` | The whole store and every business rule: `deriveStatus`, `isEffectiveDateLocked`, `findOverlaps`, `publishTemplate`, `terminateTemplate`, `duplicateTemplate`, `getLineage`, `resolveTemplate`, `relinkPolicy`, and the all-policies guard |
| `src/pages/LetterTemplatesPage.tsx` | Landing page: table, filters, status tags, row actions, terminate modal, invariant warning banner |
| `src/pages/LetterTemplateEditorPage.tsx` | Editor: header fields, rich-text body, Variable Library, preview mode, PDF export, publish/duplicate actions |
| `src/components/letter-templates/TemplateHistoryModal.tsx` | History table and two-up diff view |
| `src/hooks/use-policies.ts` | Clinical policy list feeding the policy multi-select; source of the duplication event behind auto-relink |

All state is in-browser (`localStorage`, key `letter-templates`). There is no backend.
