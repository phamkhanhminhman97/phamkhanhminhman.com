import type { BlogPost } from "../types";

const post: BlogPost = {
    slug: "double-counting-in-append-only-projections",
    date: "2026-08-21",
    category: "Django / Idempotency",
    availableIn: ["en", "vi"],
    title: {
      en: "Idempotent isn't optional: the double-counting bug hiding in every append-only sync",
      vi: "Idempotent không phải tùy chọn: lỗi đếm trùng ẩn trong mọi đồng bộ chỉ-thêm",
    },
    readTime: { en: "9 min read", vi: "9 phút đọc" },
    description: {
      en: "A polling sync detects changed records by updated_at and appends them to a history table. That works fine — until the upstream system is allowed to correct a record after the fact, and 'append' quietly becomes 'add it again'.",
      vi: "Một service polling phát hiện bản ghi thay đổi qua updated_at rồi ghi thêm vào bảng lịch sử. Chạy tốt — cho tới khi hệ thống nguồn được phép sửa lại một bản ghi đã xong, và 'ghi thêm' lặng lẽ biến thành 'cộng thêm lần nữa'.",
    },
    content: {
      en: () => (
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
            <strong>Key idempotency on the identity of the fact,</strong> not on its content
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
      vi: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Một service đồng bộ dữ liệu sản xuất chạy nhiều tháng không lỗi trong log. Rồi
          trong vài tuần, các con số tổng nó báo cáo bắt đầu trôi — luôn tăng, không bao giờ
          giảm. Không exception, không job fail, không alert nào. Chỉ là các con số lặng lẽ
          cao hơn một chút, rồi cao hơn nữa.
        </p>
        <p>
          Không có gì crash vì về mặt kỹ thuật không có gì sai. Mỗi bản ghi service ghi ra
          đều đúng, đủ trường. Lỗi không nằm ở một lần ghi nào cả — nó nằm ở việc &ldquo;ghi
          một lần&rdquo; nghĩa là gì, khi hệ thống nguồn được phép đổi ý. Dưới đây là toàn bộ
          câu chuyện rút gọn còn mười lăm dòng Python thuần — không framework, không
          database, chỉ một dict đóng vai hệ thống nguồn và một list đóng vai bảng lịch sử.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Hình dạng của việc đồng bộ</h3>
        <p>
          Một job nền polling hệ thống nguồn mỗi vài giây, phát hiện bản ghi nào thay đổi,
          rồi ghi thêm từng bản ghi vào một bảng lịch sử dùng cho báo cáo. &ldquo;Ghi
          thêm&rdquo; là lựa chọn tự nhiên — lịch sử thì không nên bị sửa lại sau đó.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`# "source" đóng vai hệ thống nguồn: một đơn hàng, đã xong, số lượng 10.
source = {"WO-42": {"status": "DONE", "qty": 10}}

history = []  # chỉ-thêm: chỉ được thêm dòng, không bao giờ sửa hay xoá

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
        <p>Đúng. Và đây cũng là toàn bộ câu chuyện trong thời gian dài — cho tới khi có người cần sửa lại một con số sau đó.</p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Bản sửa đã làm hỏng nó</h3>
        <p>
          Vài ngày sau, người vận hành nhận ra số lượng nhập sai và sửa lại: 10 đáng lẽ phải
          là 4. Hệ thống nguồn cập nhật bản ghi tại chỗ — phần đó ổn, đúng là việc một bản sửa
          nên làm. Service đồng bộ poll lại, thấy bản ghi đổi, và làm điều duy nhất nó biết
          làm:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`source["WO-42"]["qty"] = 4   # bản sửa, áp dụng ở phía nguồn

sync_once()
print(history)
print("total:", sum(h["qty"] for h in history))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`[{'order_id': 'WO-42', 'qty': 10}, {'order_id': 'WO-42', 'qty': 4}]
total: 14`}
        </pre>
        <p>
          Số lượng đã sửa là 4. Tổng báo cáo là 14 — cả con số sai ban đầu lẫn con số đúng
          đều được cộng vào. Không gì ném lỗi. Không gì log cảnh báo. Service đồng bộ làm
          đúng chính xác những gì &ldquo;phát hiện thay đổi, ghi thêm một dòng&rdquo; yêu cầu.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Vì sao một &ldquo;bước kiểm tra trùng lặp&rdquo; không cứu được nó</h3>
        <p>
          Một cơ chế bảo vệ kiểu này thường đã tồn tại sẵn, và thường trông như: nhớ lần ghi
          gần nhất cho đơn hàng này, và bỏ qua nếu lần mới trông giống hệt.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`last_seen = {}  # order_id -> snapshot lần chiếu gần nhất

def sync_once_with_dedup():
    for order_id, rec in source.items():
        if rec["status"] != "DONE":
            continue
        snapshot = {"qty": rec["qty"]}
        if last_seen.get(order_id) == snapshot:
            continue  # y hệt lần trước -> bỏ qua
        history.append({"order_id": order_id, "qty": rec["qty"]})
        last_seen[order_id] = snapshot`}
        </pre>
        <p>
          Nhìn trông như đúng thứ phần trước cần. Nhưng chạy qua đúng bản sửa vừa rồi thì nó
          không đổi được gì:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`sync_once_with_dedup()             # lần đầu: ghi thêm bình thường, lưu lại snapshot
source["WO-42"]["qty"] = 7         # một bản sửa thứ hai
sync_once_with_dedup()
print("total:", sum(h["qty"] for h in history))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`total: 21   # 10 + 4 + 7, mọi phiên bản từng thấy, vẫn cộng dồn hết`}
        </pre>
        <p>
          Bước kiểm tra này so sánh <em>nội dung</em>: snapshot này có bằng lần trước không?
          Một bản sửa, theo định nghĩa, là nội dung khác về cùng một sự việc — nên bước kiểm
          tra kết luận đúng &ldquo;đây là dữ liệu mới&rdquo; và cho qua thẳng. Nó đang trả lời
          một câu hỏi có thật, chỉ không phải câu hỏi quan trọng. Câu hỏi quan trọng không
          phải &ldquo;tôi đã thấy đúng giá trị này chưa?&rdquo; mà là{" "}
          <strong>&ldquo;tôi đã tạo ra một dòng cho sự việc này chưa?&rdquo;</strong>
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Cách sửa: khoá theo danh tính, không theo nội dung</h3>
        <p>
          Cách sửa là đổi hình dạng bằng một dòng, không phải một phép so sánh thông minh
          hơn. Thay vì một list để ghi thêm, giữ một dict khoá theo danh tính của sự việc —
          đơn hàng — và ghi vào đúng ô của nó mỗi lần:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`history_by_order = {}  # order_id -> MỘT dòng duy nhất đại diện cho nó, luôn cập nhật

def sync_once_fixed():
    for order_id, rec in source.items():
        if rec["status"] == "DONE":
            history_by_order[order_id] = {"order_id": order_id, "qty": rec["qty"]}

sync_once_fixed()
source["WO-42"]["qty"] = 7   # sửa bao nhiêu lần cũng được, thứ tự nào cũng được
sync_once_fixed()
source["WO-42"]["qty"] = 4
sync_once_fixed()
print("total:", sum(r["qty"] for r in history_by_order.values()))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`total: 4   # đúng, dù đơn hàng đã bị sửa bao nhiêu lần đi nữa`}
        </pre>
        <p>
          Phát hiện lại cùng một đơn hàng giờ cập nhật đúng một dòng của nó thay vì thêm dòng
          thứ hai. Phần chiếu hội tụ về đúng điều nguồn đang nói ở hiện tại, thay vì cộng dồn
          mọi thứ nguồn từng nói. Trong hệ thống thật, thay đổi rất nhỏ — một khoá ngoại từ
          dòng lịch sử trỏ về đúng bản ghi nguồn sinh ra nó, và UPDATE tại chỗ thay vì INSERT
          — nhưng ý tưởng nền tảng chính là cái dict này.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Đối soát với nguồn, không phải với chính bảng của mình</h3>
        <p>
          Một bản sửa như thế này dễ tin và đắt nếu sai. Phép kiểm tra duy nhất không chỉ
          tin vào chính đoạn code vừa đổi là đối soát với chính hệ thống nguồn:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def reconcile():
    source_total = sum(r["qty"] for r in source.values() if r["status"] == "DONE")
    projected_total = sum(r["qty"] for r in history_by_order.values())
    diff = projected_total - source_total
    print("OK" if diff == 0 else f"LỆCH: projected={projected_total}, source={source_total}, diff={diff}")

reconcile()`}
        </pre>
        <p>
          Chạy một lần, nó tìm ra mọi bản ghi đã bị đếm trùng từ trước khi bản sửa được đưa
          lên, để dọn dẹp một lượt. Để nó chạy thường trực — không phải một script migration
          chạy một lần — nó là thứ duy nhất trong cả câu chuyện này lẽ ra đã bắt được độ trôi
          ngay từ lần sửa đầu tiên, thay vì ba tuần sau.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. Bản sửa suýt tạo ra lỗi của chính nó</h3>
        <p>
          Cùng bản sửa đó cần chảy vào một trường thứ hai: thời điểm đơn hàng hoàn thành.
          Code cũ chỉ từng đặt giá trị đó một lần, lúc nó còn rỗng — đúng mẫu hình đã gây ra
          lỗi đếm trùng, nên bản năng là làm nó idempotent theo cùng cách: luôn ghi đè bằng
          giá trị mới nhất.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`schedule = {"WO-42": {"finished_at": None}}

# Bản đầu tiên — trông idempotent, nhưng không an toàn:
def sync_schedule(order_id):
    rec = source[order_id]
    if rec["status"] == "DONE":
        schedule[order_id]["finished_at"] = rec.get("finished_at")  # luôn ghi đè`}
        </pre>
        <p>
          Nó chạy đúng, cho tới khi một lần poll đọc bản ghi đúng lúc{" "}
          <code>finished_at</code> chưa kịp cập nhật xong dù trạng thái đã báo hoàn thành —
          một cuộc đua bình thường giữa hai trường trên cùng một bản ghi:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`source["WO-42"]["finished_at"] = 100
sync_schedule("WO-42")
print(schedule)                          # {'finished_at': 100} - đúng

source["WO-42"]["finished_at"] = None     # lượt đọc sau tới trước khi trường này kịp ghi
sync_schedule("WO-42")
print(schedule)                          # {'finished_at': None} - giá trị đúng, bị xoá`}
        </pre>
        <p>
          &ldquo;Luôn ghi đè bằng giá trị mới nhất&rdquo; vừa làm điều tệ hơn lỗi gốc: nó lấy
          một giá trị đã đúng và lặng lẽ xoá nó, vì nó chưa bao giờ tự hỏi giá trị mới có thật
          sự đầy đủ hay không. Một con số bị đếm đôi sai theo hướng dễ thấy. Một timestamp bị
          xoá âm thầm sai theo cách không có gì phía sau kêu ca cho tới rất lâu sau.
        </p>
        <p>Bị bắt lại lúc review, cách sửa chỉ thêm một điều kiện — không bao giờ để một lượt đọc dở dang lùi một giá trị tốt:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def sync_schedule_fixed(order_id):
    rec = source[order_id]
    new_value = rec.get("finished_at")
    if rec["status"] == "DONE" and new_value is not None:   # <- chốt chặn
        schedule[order_id]["finished_at"] = new_value`}
        </pre>
        <p>
          Bài học không phải là &ldquo;thêm một chỗ check null&rdquo;. Mà là{" "}
          <strong>&ldquo;idempotent&rdquo; và &ldquo;luôn lấy giá trị mới nhất&rdquo; không
          phải cùng một tính chất.</strong> Cái đầu nghĩa là chạy lại cùng input cho cùng kết
          quả. Cái sau lặng lẽ giả định mọi lần đọc giá trị mới nhất đều đầy đủ — và ngay khi
          giả định đó sai, idempotent-bằng-ghi-đè bắt đầu phá huỷ dữ liệu mà lỗi đếm trùng
          chỉ-thêm chỉ làm phồng lên.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. Điều khái quát được ra ngoài service này</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Phát hiện thay đổi bằng timestamp cộng với ghi chỉ-thêm là một lỗi đang
            chờ một lần sửa.</strong> Nếu nguồn từng có thể phát lại cùng trạng thái với số
            liệu khác, bạn đã có lỗi này — chỉ là chưa gặp lần sửa nào thôi.
          </li>
          <li>
            <strong>Khoá idempotency theo danh tính của sự việc,</strong> không theo nội dung
            hay khung thời gian polling. Nội dung cho biết dữ liệu trông có mới hay không;
            danh tính mới là thứ giúp bạn tìm ra &ldquo;dòng mà sự việc này đã từng sinh
            ra&rdquo; để cập nhật, thay vì cộng thêm.
          </li>
          <li>
            <strong>Idempotent không có nghĩa là luôn ghi đè.</strong> Mọi lần ghi đè vô điều
            kiện cần một chốt chặn giá trị đến là null, cũ, hoặc chưa đầy đủ — nếu không, bạn
            biến một lỗi đếm trùng thành một lỗi mất dữ liệu ngay lần đầu một lượt đọc chạy
            trước một lượt ghi.
          </li>
          <li>
            <strong>Giữ phép đối soát như một job thường trực, không phải một script
            migration.</strong> Đó là thứ duy nhất trong câu chuyện này lẽ ra đã bắt được độ
            trôi ngay ngày đầu, thay vì tới tuần thứ ba.
          </li>
        </ul>
        <p>
          Tôi gặp chuyện này khi xây một service đồng bộ dữ liệu sản xuất giữa hai hệ thống
          backend cho một khách hàng — model Django và bảng Postgres thật, không phải một
          dict với một list. Nhưng lỗi và cách sửa chính là mười lăm dòng này. Bản sửa đầu
          tiên tôi viết giải quyết được lỗi đếm trùng và, tự nó, tạo ra lỗi lùi-về-null nói
          trên — bị bắt lại lúc review, không phải trên production, đúng là kết quả bạn muốn
          có được từ việc viết phép đối soát trước khi ship, chứ không phải sau khi có người
          hỏi vì sao các con số trông là lạ.
        </p>
      </div>
      ),
    },
};

export default post;
