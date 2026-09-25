import type { BlogPost } from "../types";

const post: BlogPost = {
    slug: "double-counting-in-append-only-projections",
    date: "2026-08-21",
    category: "Django / Idempotency",
    title: "Idempotent isn't optional: the double-counting bug hiding in every append-only sync",
    readTime: "9 min read",
    description: "A polling sync detects changed records by updated_at and appends them to a history table. That works fine — until the upstream system is allowed to correct a record after the fact, and 'append' quietly becomes 'add it again'.",
    content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          A production-tracking sync had been running for months without a single error in
          the logs. Then, over a few weeks, the totals it reported started drifting — always
          upward, never down. No exception, no failed job, no alert. Just numbers that were
          quietly a bit too high, then a bit higher.
        </p>
        <p>
          Nothing was crashing because nothing was, technically, wrong. Every record the
          sync wrote was a correct, well-formed row. The bug was not in any single write —
          it was in what &ldquo;write once&rdquo; meant once the upstream system was allowed
          to change its mind. Here is the whole thing reduced to fifteen lines of plain
          Python — no framework, no database, just a dict standing in for the upstream
          system and a list standing in for the history table.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. The shape of the sync</h3>
        <p>
          A background job polls an upstream system every few seconds, notices which
          records changed, and appends each one to a history table used for reporting.
          &ldquo;Append&rdquo; is the natural choice — history should not get edited after
          the fact.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`# "source" stands in for the upstream system: one work order, done, qty 10.
source = {"WO-42": {"status": "DONE", "qty": 10}}

history = []  # append-only: we only ever add rows, never edit or remove one

def sync_once():
    for order_id, rec in source.items():
        if rec["status"] == "DONE":
            history.append({"order_id": order_id, "qty": rec["qty"]})

sync_once()
print(history)
print("total:", sum(h["qty"] for h in history))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`[{'order_id': 'WO-42', 'qty': 10}]
total: 10`}
        </pre>
        <p>Correct. This is also, for a long time, the whole story — right up until someone needs to fix a number after the fact.</p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. The correction that broke it</h3>
        <p>
          A few days later an operator notices the quantity was entered wrong and corrects
          it: 10 should have been 4. The upstream system updates the record in place — that
          part is fine, that is exactly what a correction should do. The sync polls again,
          notices the record changed, and does the only thing it knows how to do:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`source["WO-42"]["qty"] = 4   # the correction, applied upstream

sync_once()
print(history)
print("total:", sum(h["qty"] for h in history))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`[{'order_id': 'WO-42', 'qty': 10}, {'order_id': 'WO-42', 'qty': 4}]
total: 14`}
        </pre>
        <p>
          The corrected quantity is 4. The reported total is 14 — the wrong original number,
          plus the correct one, both counted. Nothing threw. Nothing logged a warning. The
          sync did precisely what &ldquo;detect a change, append a row&rdquo; says to do.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Why a &ldquo;duplicate check&rdquo; didn&apos;t save it</h3>
        <p>
          A safeguard like this usually already exists, and it usually looks like: remember
          the last thing you wrote for this order, and skip if the new one looks the same.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`last_seen = {}  # order_id -> the last snapshot we projected

def sync_once_with_dedup():
    for order_id, rec in source.items():
        if rec["status"] != "DONE":
            continue
        snapshot = {"qty": rec["qty"]}
        if last_seen.get(order_id) == snapshot:
            continue  # identical to last time -> skip
        history.append({"order_id": order_id, "qty": rec["qty"]})
        last_seen[order_id] = snapshot`}
        </pre>
        <p>
          This looks like exactly the fix the previous section needed. Run it through the
          same correction, though, and it changes nothing:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`sync_once_with_dedup()             # first call: appends normally, records the snapshot
source["WO-42"]["qty"] = 7         # a second correction
sync_once_with_dedup()
print("total:", sum(h["qty"] for h in history))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`total: 21   # 10 + 4 + 7, every version ever seen, still summed together`}
        </pre>
        <p>
          The check compares <em>content</em>: is this snapshot equal to the last one? A
          correction is, by definition, different content about the same fact — so the check
          correctly concludes &ldquo;this is new data&rdquo; and lets it straight through.
          It is answering a real question, just not the one that matters. The question that
          matters is not &ldquo;have I seen this exact value before?&rdquo; but{" "}
          <strong>&ldquo;have I already produced a row for this fact?&rdquo;</strong>
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. The fix: key by identity, not by content</h3>
        <p>
          The fix is a one-line change in shape, not a smarter comparison. Instead of a list
          you append to, keep a dict keyed by the identity of the fact — the order — and
          write into its slot every time:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`history_by_order = {}  # order_id -> the ONE row that represents it, always current

def sync_once_fixed():
    for order_id, rec in source.items():
        if rec["status"] == "DONE":
            history_by_order[order_id] = {"order_id": order_id, "qty": rec["qty"]}

sync_once_fixed()
source["WO-42"]["qty"] = 7   # as many corrections as you like, in any order
sync_once_fixed()
source["WO-42"]["qty"] = 4
sync_once_fixed()
print("total:", sum(r["qty"] for r in history_by_order.values()))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`total: 4   # correct, no matter how many times the order was corrected`}
        </pre>
        <p>
          Re-detecting the same order now updates its one row instead of adding a second.
          The projection converges to whatever the source currently says, instead of
          accumulating everything the source has ever said. The change in a real system is
          small — a foreign key from the history row back to the source row it came from,
          and an update-in-place instead of an insert — but the underlying idea is exactly
          this dict.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Verify against the source, not against your own table</h3>
        <p>
          A fix like this is easy to believe and expensive to be wrong about. The only check
          that is not just trusting the code that just changed is a reconciliation against
          the upstream system itself:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def reconcile():
    source_total = sum(r["qty"] for r in source.values() if r["status"] == "DONE")
    projected_total = sum(r["qty"] for r in history_by_order.values())
    diff = projected_total - source_total
    print("OK" if diff == 0 else f"MISMATCH: projected={projected_total}, source={source_total}, diff={diff}")

reconcile()`}
        </pre>
        <p>
          Run once, this finds every record already double-counted before the fix shipped,
          so the backlog can be cleaned up in one pass. Left running permanently — not as a
          one-off migration script — it is the one thing in this whole story that would have
          caught the drift after the very first correction instead of three weeks later.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. The fix that almost introduced its own bug</h3>
        <p>
          The same correction needs to flow into a second field: when the order finished.
          The existing code only ever set that once, while it was still empty — exactly the
          pattern that caused the double-counting bug, so the instinct is to make it
          idempotent the same way: always overwrite with the latest value.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`schedule = {"WO-42": {"finished_at": None}}

# First pass — looks idempotent, is not safe:
def sync_schedule(order_id):
    rec = source[order_id]
    if rec["status"] == "DONE":
        schedule[order_id]["finished_at"] = rec.get("finished_at")  # always overwrite`}
        </pre>
        <p>
          It works, right up until a poll reads the record at a moment where{" "}
          <code>finished_at</code> has not landed yet even though the status already says
          done — a plain race between two fields on the same record:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`source["WO-42"]["finished_at"] = 100
sync_schedule("WO-42")
print(schedule)                          # {'finished_at': 100} - correct

source["WO-42"]["finished_at"] = None     # a later read arrives before the field lands
sync_schedule("WO-42")
print(schedule)                          # {'finished_at': None} - a correct value, wiped`}
        </pre>
        <p>
          &ldquo;Always overwrite with the latest value&rdquo; just did something worse than
          the original bug: it took a value that was already correct and quietly erased it,
          because it never asked whether the new value was actually complete. A doubled
          number is wrong in an obvious direction. A silently deleted timestamp is wrong in a
          way nothing downstream complains about until much later.
        </p>
        <p>Caught in review, the fix is one extra condition — never let an incomplete read regress a good value:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def sync_schedule_fixed(order_id):
    rec = source[order_id]
    new_value = rec.get("finished_at")
    if rec["status"] == "DONE" and new_value is not None:   # <- the guard
        schedule[order_id]["finished_at"] = new_value`}
        </pre>
        <p>
          The lesson is not &ldquo;add a null check&rdquo;. It is that{" "}
          <strong>&ldquo;idempotent&rdquo; and &ldquo;always take the latest value&rdquo; are
          not the same property.</strong> The first means re-running the same input produces
          the same result. The second silently assumes every read of the latest value is
          complete — and the moment that assumption is false, overwrite-idempotency starts
          destroying data that append-only duplication only inflated.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. What generalizes past this one sync</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Change detection by timestamp plus append-only writes is a bug waiting on
            a correction.</strong> If the upstream can ever re-emit the same status with
            different data, you already have this — you just have not had a correction yet.
          </li>
          <li>
            <strong>Key idempotency on the identity of the fact,</strong>{" "}not on its content
            or on a polling time window. Content tells you whether the data looks new;
            identity is what lets you find &ldquo;the row this fact already produced&rdquo;
            and update it instead of adding to it.
          </li>
          <li>
            <strong>Idempotent does not mean always-overwrite.</strong> Every unconditional
            overwrite needs a guard against the incoming value being null, stale, or
            otherwise incomplete — or you convert a duplication bug into a data-loss bug the
            first time a read races ahead of a write.
          </li>
          <li>
            <strong>Keep the reconciliation check as a standing job, not a migration
            script.</strong> It is the only thing in this story that would have caught the
            drift on day one instead of week three.
          </li>
        </ul>
        <p>
          I found this while building a production-tracking sync between two backend
          systems for a client — real Django models and a Postgres table, not a dict and a
          list. But the bug and the fix are exactly these fifteen lines. The first patch I
          wrote solved the double-counting and, on its own, introduced the null-regression
          above — caught in review, not in production, which is the outcome you actually
          want from writing the reconciliation check before you ship, not after someone asks
          why the totals look odd.
        </p>
      </div>
    ),
};

export default post;
