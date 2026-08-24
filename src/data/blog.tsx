import React from "react";
import type { Localized } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

export interface BlogPost {
  slug: string;
  /** ISO `YYYY-MM-DD`. Hiển thị được định dạng theo ngôn ngữ lúc render. */
  date: string;
  category: string;
  /**
   * Ngôn ngữ bài viết THẬT SỰ có. Ba bài đầu chỉ có tiếng Việt — chúng nhắm tới
   * lập trình viên tích hợp sàn TMĐT Việt Nam. Không dịch máy: một bài kỹ thuật
   * dịch ẩu hại uy tín hơn là không có bản dịch.
   */
  availableIn: Locale[];
  title: Localized<string>;
  readTime: Localized<string>;
  description: Localized<string>;
  content: Localized<() => React.JSX.Element>;
}

/** Bài chỉ có một ngôn ngữ: cùng một JSX cho cả hai locale. Trang bài viết đọc
 *  `availableIn` để hiện banner "bài này viết bằng tiếng Việt". */
function sameForBothLocales(
  render: () => React.JSX.Element,
): Localized<() => React.JSX.Element> {
  return { en: render, vi: render };
}

export const blogPosts: BlogPost[] = [
  {
    slug: "optimistic-vs-pessimistic-locking",
    date: "2026-08-21",
    category: "PostgreSQL / Concurrency",
    availableIn: ["en", "vi"],
    title: {
      en: "Overselling in a flash sale: which lock to reach for, and when you need none",
      vi: "Bán vượt kho khi flash sale: nên dùng khoá nào, và khi nào không cần khoá gì cả",
    },
    readTime: { en: "14 min read", vi: "14 phút đọc" },
    description: {
      en: "A flash sale with 100 shirts in stock took 200 orders — and the stock column still read 94. Measured on real PostgreSQL: the one-line fix nobody reaches for first, the lock that makes checkout 149× slower, the case where pessimistic locking cannot be used at all, and why a perfectly correct row lock still loses inventory once a queue is in the path.",
      vi: "Flash sale 100 áo nhận 200 đơn — mà cột tồn kho vẫn hiển thị 94. Đo trên PostgreSQL thật: cách sửa một dòng ít ai nghĩ tới đầu tiên, cái khoá làm thanh toán chậm đi 149 lần, trường hợp pessimistic lock không dùng được, và vì sao một khoá dòng hoàn toàn đúng vẫn mất hàng khi có queue trên đường đi.",
    },
    content: {
      en: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          A flash sale opens. There are 100 shirts in stock. When it closes, the orders table
          has <strong>200 paid orders</strong> — and the stock column still says{" "}
          <strong>94 remaining</strong>.
        </p>
        <p>
          Both numbers are wrong, and they are wrong in different ways. That second number is
          the interesting one: stock is not negative, which is what you would expect from
          simple over-decrementing. It is 94 because the writes were overwriting each other.
        </p>
        <p>
          No exception was raised. No log line was written. Every individual request did
          exactly what its code said.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. The code that does this</h3>
        <p>
          It is the version everybody writes first, and it reads as obviously correct:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def buy(conn):
    stock = conn.execute("SELECT stock FROM product WHERE id = 0").fetchone()[0]
    if stock > 0:
        time.sleep(0.001)              # shipping fee, coupon check, fraud score...
        conn.execute("UPDATE product SET stock = %s WHERE id = 0", (stock - 1,))
        conn.execute("INSERT INTO orders (product_id) VALUES (0)")
    conn.commit()`}
        </pre>
        <p>
          Read the stock, check it is positive, decrement, create the order. Run it with 40
          threads all pressing Buy at the same moment, 200 attempts against 100 shirts:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`FLASH SALE — 100 shirts in stock, 200 Buy clicks at once

  1. read → check → write  (the first version anyone writes)
     sold 200 orders | stock shows 94 | OVERSOLD BY 100
     0.20 seconds`}
        </pre>
        <p>
          Every one of the 200 requests read the stock <em>before</em> any of them had
          written. All 200 saw a positive number, all 200 passed the check, all 200 sold a
          shirt. And because each one wrote back <code>stock - 1</code> computed from{" "}
          <em>its own</em> stale read, the last writer won: the final value reflects one
          decrement, not 200.
        </p>
        <p>
          The window is one millisecond wide. That is enough. It always is.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. The fix most people skip past</h3>
        <p>
          The instinct at this point is to reach for a lock. Before doing that, look at why
          the bug exists: <strong>the application read a number, then computed a new value
          from it.</strong> The gap between those two steps is the whole problem.
        </p>
        <p>
          Close the gap by making the database do both in one statement:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def buy(conn):
    n = conn.execute(
        "UPDATE product SET stock = stock - 1 WHERE id = 0 AND stock > 0"
    ).rowcount                          # <- the check and the decrement, together
    if n == 1:
        conn.execute("INSERT INTO orders (product_id) VALUES (0)")
    conn.commit()`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  2. one SQL statement: WHERE stock > 0
     sold 100 orders | stock 0 | matches
     0.22 seconds`}
        </pre>
        <p>
          Exactly 100 sold. No lock, no version column, no retry loop, and no slower than the
          broken version. <code>rowcount</code> tells you whether you got a shirt: 1 means
          yes, 0 means someone else took the last one.
        </p>
        <p>
          This works because a single <code>UPDATE</code> is atomic. PostgreSQL evaluates{" "}
          <code>stock &gt; 0</code> and writes <code>stock - 1</code> against the row as it
          exists at write time — the stale value your earlier <code>SELECT</code> returned
          never enters the calculation.
        </p>
        <p>
          A lot of production locking code exists to protect arithmetic the database would
          have done atomically for free. If your update fits in one statement, you are done
          here.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. When one statement is not enough</h3>
        <p>
          Now a real cart: three different items, and the order must reserve{" "}
          <strong>all three or none</strong>. If the third item is out of stock, the first two
          must not be decremented.
        </p>
        <p>
          That cannot be expressed as one <code>UPDATE</code>. You need to hold all three rows
          steady while you decide. This is what <code>SELECT ... FOR UPDATE</code> is for — it
          takes a row lock as part of the read, so nobody else can touch those rows until you
          commit:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def checkout(conn, items):
    for pid in items:
        conn.execute("SELECT stock FROM product WHERE id = %s FOR UPDATE", (pid,))
        time.sleep(0.002)              # check stock, price the line, log...
    for pid in items:
        conn.execute("UPDATE product SET stock = stock - 1 WHERE id = %s", (pid,))
        conn.execute("INSERT INTO orders (product_id) VALUES (%s)", (pid,))
    conn.commit()`}
        </pre>
        <p>
          Correct, and it does prevent overselling. Then eight customers check out at the same
          time, each with three random items out of eight products:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CART OF 3 ITEMS — 8 customers checking out at once, 15 carts each

           lock order |  deadlocks |  seconds | stock consistent
----------------------+------------+----------+-----------------
  order in the cart   |        220 |   132.30 | ✓`}
        </pre>
        <p>
          Two minutes and twelve seconds for 360 items, and 220 deadlocks along the way.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Why it deadlocks, and the one-line fix</h3>
        <p>
          Customer A has a cart of <code>[3, 7]</code>. Customer B has <code>[7, 3]</code>. A
          locks row 3 and reaches for 7; B locks row 7 and reaches for 3. Neither can move,
          and neither will ever release what it holds. PostgreSQL detects the cycle and kills
          one of them.
        </p>
        <p>
          The carts are the same. Only the order in which the code happened to lock them
          differed. So make that order impossible to differ:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`    for pid in sorted(items):          # <- lock in a globally consistent order
        conn.execute("SELECT stock FROM product WHERE id = %s FOR UPDATE", (pid,))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`           lock order |  deadlocks |  seconds | stock consistent
----------------------+------------+----------+-----------------
  order in the cart   |        220 |   132.30 | ✓
  always sorted by id |          0 |     0.89 | ✓`}
        </pre>
        <p>
          Deadlocks go to zero and checkout runs <strong>149× faster</strong>. Any total order
          works — sort by id, by SKU, by anything — as long as every transaction in the system
          uses the same one. If two code paths lock the same tables in different orders, you
          have this bug waiting.
        </p>
        <p>
          Note this only fires under real concurrency with overlapping carts. It will not show
          up in local testing, and it will not show up in staging. It shows up on sale day.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. The case where pessimistic locking is simply unavailable</h3>
        <p>
          Now the flow that actually ships: reserve the stock, send the customer to a payment
          gateway, wait for the gateway to answer, then confirm the order.
        </p>
        <p>
          Look again at what a row lock is attached to. It lives from{" "}
          <code>SELECT ... FOR UPDATE</code> until <code>COMMIT</code>, and there is no way to
          hold one outside a transaction. So holding stock across the gateway call means
          keeping a transaction open — which means keeping a{" "}
          <strong>database connection</strong> open — for as long as the payment provider
          takes to answer.
        </p>
        <p>
          Connections are a small fixed pool. Eight concurrent checkouts, a pool of four, 200
          different products so genuine conflicts are rare:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Gateway takes</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Strategy</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">orders/s</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">total s</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">retries</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">50 ms</td><td className="p-3">pessimistic</td><td className="p-3">67.6</td><td className="p-3">1.42</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-200"><td className="p-3">50 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">132.9</td><td className="p-3">0.72</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">200 ms</td><td className="p-3">pessimistic</td><td className="p-3">19.1</td><td className="p-3">5.01</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-200"><td className="p-3">200 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">37.8</td><td className="p-3">2.54</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">500 ms</td><td className="p-3">pessimistic</td><td className="p-3">7.9</td><td className="p-3">12.22</td><td className="p-3">0</td></tr>
              <tr><td className="p-3">500 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">15.6</td><td className="p-3">6.15</td><td className="p-3">0</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Optimistic is <strong>exactly 2× faster at every gateway latency, with zero
          retries.</strong> Not a single conflict occurred in any of these runs.
        </p>
        <p>
          The 2× is not a coincidence — it is eight customers divided by four connections.
          Pessimistic occupies a connection for the whole gateway call, so only four checkouts
          can be in flight. Optimistic hands the connection back before calling the gateway:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`# read the version, then RELEASE the connection
conn = pool.acquire()
stock, v = conn.execute("SELECT stock, version FROM product WHERE id = %s", (pid,)).fetchone()
pool.release(conn)

pay(gateway_ms)                        # holding nothing: no lock, no connection

# confirm, but only if nobody changed the row while we were away
conn = pool.acquire()
n = conn.execute(
    "UPDATE product SET stock = %s, version = version + 1 "
    "WHERE id = %s AND version = %s",  # <- the entire optimistic mechanism
    (stock - 1, pid, v),
).rowcount
pool.release(conn)
# n == 0 -> somebody else bought it first: re-read and try again`}
        </pre>
        <p>
          This is the case the usual advice gets wrong. &ldquo;Conflicts are rare here, so it
          does not matter much&rdquo; leads you to the simpler-looking pessimistic version and
          halves your throughput. Worse, the symptom is connection pool exhaustion — which
          looks nothing like a locking problem while you are staring at it during a sale.
        </p>
        <p>
          And if the gap is a human rather than a gateway — the customer sits on the payment
          page for two minutes — pessimistic locking is not slow, it is{" "}
          <strong>impossible</strong>. You cannot hold a database transaction open for two
          minutes per customer.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. What optimistic costs when the item is genuinely hot</h3>
        <p>
          Optimistic locking has its own failure mode, and it is the exact opposite scenario:
          everybody fighting over one row. Back to the original flash sale — 200 buyers, one
          product:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  3. pessimistic: SELECT ... FOR UPDATE
     sold 100 orders | stock 0 | matches
     0.40 seconds

  4. optimistic: version column + retry
     sold 100 orders | stock 0 | matches
     0.53 seconds | 2136 retries`}
        </pre>
        <p>
          Both correct. But optimistic burned <strong>2136 wasted attempts</strong> to place
          100 orders — twenty-one thrown-away transactions per shirt sold. Each one read the
          row, did the work, lost the race, and started over.
        </p>
        <p>
          That is the structural difference between the two, in one line:{" "}
          <strong>pessimistic turns contention into waiting; optimistic turns it into wasted
          work.</strong> Waiting is bounded and fair. Wasted work compounds — the more people
          are competing, the more of them lose, and losers immediately rejoin the competition.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. One more option, on PostgreSQL</h3>
        <p>
          You do not have to maintain a <code>version</code> column by hand. Raise the
          isolation level and PostgreSQL does the same detection for you:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`conn.isolation_level = psycopg.IsolationLevel.REPEATABLE_READ

  T1 reads stock 100, T2 reads stock 100
  T1 writes 99, COMMIT
  T2 writes -> SerializationFailure: could not serialize access due to concurrent update
  T2 retries: reads 99, writes 98, COMMIT`}
        </pre>
        <p>
          Same semantics as the version column, no schema change, and — the real benefit — no
          update path that can silently forget to include{" "}
          <code>AND version = ?</code> and quietly reintroduce the bug. You still need the
          retry loop; the failure arrives as an exception instead of{" "}
          <code>rowcount == 0</code>.
        </p>
        <p>
          Worth knowing while you are here: PostgreSQL implements Repeatable Read as{" "}
          <em>snapshot isolation</em>, not with read locks, and its Repeatable Read already
          prevents phantom reads — stronger than the SQL standard requires at that level. The
          isolation-level table most tutorials reproduce is the standard&apos;s table, not
          PostgreSQL&apos;s.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">8. The lock only protects one layer</h3>
        <p>
          Everything above quietly assumed the order goes straight from the buyer into the
          database. It does not. In any real system the path looks closer to:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`browser -> load balancer -> N app servers -> queue -> M workers -> database`}
        </pre>
        <p>
          Every arrow there is a place the same logical order can become two. The browser
          retries a request that timed out. The load balancer routes the retry to a different
          app server, so an in-process mutex protects nothing. And the queue — SQS, RabbitMQ,
          Kafka — guarantees <strong>at-least-once</strong> delivery. When a worker dies
          mid-handler, or an ack is lost, the message is delivered again. That is the queue
          working correctly, not a bug.
        </p>
        <p>
          So: keep the pessimistic lock from §3, written perfectly, and let 25 of 100 messages
          be redelivered.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`QUEUE REDELIVERY — stock 200, 100 real orders, 8 workers

  A. SELECT ... FOR UPDATE only  (the row lock is entirely correct)
     queue delivered 125 messages (25 redelivered)
     -> created 125 order rows   (should be 100)
     -> stock left 75            (should be 100)
     -> 25 shirts gone that nobody bought, 25 customers charged twice`}
        </pre>
        <p>
          The lock did its job. Both deliveries of the same order acquired it, one after the
          other, each read a consistent stock value, each decremented exactly once. There was
          no race and no lost update. The inventory is simply gone.
        </p>
        <p>
          This is the distinction that matters, and it is easy to miss because both things get
          called &ldquo;locking&rdquo;:{" "}
          <strong>a row lock serializes access to a row. It does not make an operation happen
          once.</strong> Overselling protection needs the first. Redelivery protection needs
          the second. They are different guarantees, and no isolation level gives you the
          second one.
        </p>
        <p>
          The second guarantee lives at a different layer — on a business key the client
          generates and that travels with the request through every hop:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE TABLE orders (order_id text PRIMARY KEY, product_id int NOT NULL)

def handle(conn, order_id):
    n = conn.execute(
        "INSERT INTO orders (order_id, product_id) VALUES (%s, 0) "
        "ON CONFLICT (order_id) DO NOTHING",     # <- the guard, at the business key
        (order_id,),
    ).rowcount
    if n == 0:
        conn.commit()                            # already processed: do NOT decrement again
        return
    conn.execute("UPDATE product SET stock = stock - 1 WHERE id = 0 AND stock > 0")
    conn.commit()`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  B. guard at the business key: INSERT ... ON CONFLICT DO NOTHING
     queue delivered 125 messages (25 redelivered)
     -> created 100 order rows   correct
     -> stock left 100           correct`}
        </pre>
        <p>
          Note the insert comes <em>first</em> and the decrement second, in the same
          transaction. The unique constraint is what decides whether this delivery is the
          first one; the decrement only runs if it was. Reverse the order and you are back to
          checking-then-acting, which is the bug from §1 wearing different clothes.
        </p>
        <p>Each layer has its own hazard, and its own mechanism:</p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 w-[28%] font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Layer</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">How one operation becomes two</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">What actually helps</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">Browser / client</td><td className="p-3 align-top">double-click, retry after timeout</td><td className="p-3 align-top">idempotency key generated by the client</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">LB → N app servers</td><td className="p-3 align-top">retry lands on a different instance</td><td className="p-3 align-top">the guard must be outside the process</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">Queue → M workers</td><td className="p-3 align-top">at-least-once redelivery</td><td className="p-3 align-top">dedup on the business key</td></tr>
              <tr><td className="p-3 align-top">Database</td><td className="p-3 align-top">interleaved transactions</td><td className="p-3 align-top">atomic statement, or a row lock</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The idempotency key does not replace anything in §2 through §7 — it guards a
          different failure. Two <em>different</em> customers racing for the last shirt is a
          concurrency problem and needs the DB mechanisms. The <em>same</em> customer arriving
          twice is an identity problem and needs the unique key. A system that ships only one
          of the two is not half-safe; it is fully exposed to the other half.
        </p>
        <h3 className="font-sans font-bold text-lg text-black pt-4">9. The decision, in order</h3>
        <p>Ask these in sequence and you will not need to guess about conflict probability:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Can the same request arrive twice?</strong> Through a retry, a queue, or a
            double-click — yes, it can. Put a unique business key on the write path before you
            think about locks at all (§8). No lock and no isolation level substitutes for it.
          </li>
          <li>
            <strong>Does the update fit in one SQL statement?</strong> Then write it that way
            and use no locking at all. <code>UPDATE ... WHERE stock &gt; 0</code> plus{" "}
            <code>rowcount</code> solves single-item stock completely (§2).
          </li>
          <li>
            <strong>Does the work happen inside one transaction, start to finish?</strong> If
            it spans requests, waits on a human, or calls an external service — pessimistic is
            unavailable, because it would hold a connection the whole time (§5). Use
            optimistic.
          </li>
          <li>
            <strong>Inside one transaction, touching several rows?</strong> Use{" "}
            <code>FOR UPDATE</code> — and lock in a sorted, globally consistent order, or you
            will find the 149× penalty on sale day (§3, §4).
          </li>
          <li>
            <strong>Inside one transaction, everyone fighting over one row?</strong>{" "}
            Pessimistic. Bounded waiting beats 2136 discarded attempts (§6).
          </li>
          <li>
            <strong>On PostgreSQL, consider Repeatable Read</strong> instead of a hand-rolled
            version column (§7).
          </li>
        </ul>
        <p>
          The usual rule — optimistic when conflicts are rare, pessimistic when they are
          common — is not wrong so much as premature. It answers the last question on this
          list. The first two decide the outcome far more often, and neither of them is about
          how likely a collision is.
        </p>
        <p className="text-zinc-500 text-[13px]">
          Measured on PostgreSQL 17.11 (Alpine, Docker) via psycopg 3.2.13. Absolute
          throughput is laptop throughput and not meaningful on its own — the ratios and the
          failure shapes are the point, and those reproduce.
        </p>
      </div>
      ),
      vi: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Một đợt flash sale mở bán. Kho có 100 chiếc áo. Khi đóng đợt, bảng đơn hàng có{" "}
          <strong>200 đơn đã thanh toán</strong> — còn cột tồn kho vẫn hiển thị{" "}
          <strong>còn 94 chiếc</strong>.
        </p>
        <p>
          Cả hai con số đều sai, và sai theo hai kiểu khác nhau. Con số thứ hai mới đáng chú ý:
          tồn kho không hề âm, thứ mà bạn sẽ trông đợi nếu chỉ đơn giản là trừ quá tay. Nó bằng
          94 vì các lệnh ghi đã đè lên nhau.
        </p>
        <p>
          Không exception nào được ném ra. Không dòng log nào được ghi. Mỗi request riêng lẻ
          đều làm đúng chính xác những gì code của nó nói.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Đoạn code gây ra chuyện này</h3>
        <p>
          Đây là bản mà ai cũng viết đầu tiên, và đọc lên thì thấy đúng hiển nhiên:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def buy(conn):
    stock = conn.execute("SELECT stock FROM product WHERE id = 0").fetchone()[0]
    if stock > 0:
        time.sleep(0.001)              # tính phí ship, kiểm mã giảm giá, chấm điểm gian lận...
        conn.execute("UPDATE product SET stock = %s WHERE id = 0", (stock - 1,))
        conn.execute("INSERT INTO orders (product_id) VALUES (0)")
    conn.commit()`}
        </pre>
        <p>
          Đọc tồn kho, kiểm tra còn hàng, trừ đi một, tạo đơn. Chạy với 40 luồng cùng bấm Mua
          đúng một thời điểm, 200 lượt bấm cho 100 chiếc áo:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`FLASH SALE — kho có 100 áo, 200 lượt bấm Mua cùng lúc

  1. Đọc → kiểm tra → ghi  (cách viết đầu tiên)
     đã bán 200 đơn | kho còn 94 | BÁN VƯỢT 100 ÁO
     0.20 giây`}
        </pre>
        <p>
          Cả 200 request đều đọc tồn kho <em>trước khi</em> có bất kỳ ai kịp ghi. Cả 200 đều
          thấy một số dương, cả 200 đều qua được câu kiểm tra, cả 200 đều bán ra một chiếc áo.
          Và vì mỗi request ghi lại <code>stock - 1</code> tính từ giá trị cũ{" "}
          <em>của riêng nó</em>, người ghi cuối cùng thắng: giá trị còn lại phản ánh đúng một
          lần trừ, không phải 200 lần.
        </p>
        <p>
          Cửa sổ rộng đúng một mili-giây. Thế là đủ. Luôn luôn đủ.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Cách sửa mà phần lớn người ta bỏ qua</h3>
        <p>
          Bản năng lúc này là với tay tới một cái khoá. Trước khi làm vậy, hãy nhìn lại vì sao
          lỗi tồn tại: <strong>ứng dụng đọc ra một con số, rồi tự tính giá trị mới từ nó.</strong>{" "}
          Khoảng trống giữa hai bước đó chính là toàn bộ vấn đề.
        </p>
        <p>
          Đóng khoảng trống lại bằng cách để database làm cả hai trong một câu lệnh:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def buy(conn):
    n = conn.execute(
        "UPDATE product SET stock = stock - 1 WHERE id = 0 AND stock > 0"
    ).rowcount                          # <- kiểm tra và trừ, cùng một lúc
    if n == 1:
        conn.execute("INSERT INTO orders (product_id) VALUES (0)")
    conn.commit()`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  2. Một câu SQL: WHERE stock > 0
     đã bán 100 đơn | kho còn 0 | khớp
     0.22 giây`}
        </pre>
        <p>
          Đúng 100 đơn. Không khoá, không cột version, không vòng thử lại, và cũng không chậm
          hơn bản bị lỗi. <code>rowcount</code> cho bạn biết có mua được áo hay không: 1 là
          được, 0 là người khác vừa lấy mất chiếc cuối.
        </p>
        <p>
          Nó hoạt động vì một câu <code>UPDATE</code> là nguyên tử. PostgreSQL tính{" "}
          <code>stock &gt; 0</code> và ghi <code>stock - 1</code> dựa trên dòng đúng như nó tồn
          tại tại thời điểm ghi — giá trị cũ mà câu <code>SELECT</code> trước đó trả về không
          bao giờ lọt vào phép tính.
        </p>
        <p>
          Có rất nhiều code lock trên production tồn tại chỉ để bảo vệ một phép tính mà database
          vốn đã làm nguyên tử và miễn phí. Nếu câu cập nhật của bạn gói được vào một câu lệnh,
          bạn xong việc ở đây.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Khi một câu lệnh không còn đủ</h3>
        <p>
          Giờ tới giỏ hàng thật: ba món khác nhau, và đơn hàng phải giữ được{" "}
          <strong>cả ba hoặc không món nào</strong>. Nếu món thứ ba hết hàng, hai món đầu không
          được phép bị trừ kho.
        </p>
        <p>
          Điều đó không diễn đạt được bằng một câu <code>UPDATE</code>. Bạn cần giữ cả ba dòng
          đứng yên trong lúc quyết định. Đó chính là việc của{" "}
          <code>SELECT ... FOR UPDATE</code> — nó lấy khoá dòng như một phần của thao tác đọc,
          nên không ai đụng được vào các dòng đó cho tới khi bạn commit:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`def checkout(conn, items):
    for pid in items:
        conn.execute("SELECT stock FROM product WHERE id = %s FOR UPDATE", (pid,))
        time.sleep(0.002)              # kiểm tồn, tính giá dòng, ghi log...
    for pid in items:
        conn.execute("UPDATE product SET stock = stock - 1 WHERE id = %s", (pid,))
        conn.execute("INSERT INTO orders (product_id) VALUES (%s)", (pid,))
    conn.commit()`}
        </pre>
        <p>
          Đúng, và nó thật sự ngăn được bán vượt kho. Rồi tám khách cùng thanh toán một lúc,
          mỗi người ba món ngẫu nhiên trong tám sản phẩm:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`GIỎ HÀNG 3 MÓN — 8 người thanh toán cùng lúc, 15 giỏ mỗi người

           thứ tự khoá món |  deadlock |   giây | kho khớp
---------------------------+-----------+--------+---------
     theo thứ tự trong giỏ |       220 | 132.30 | ✓`}
        </pre>
        <p>
          Hai phút mười hai giây cho 360 món, và 220 lần deadlock trên đường đi.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Vì sao deadlock, và cách sửa một dòng</h3>
        <p>
          Khách A có giỏ <code>[3, 7]</code>. Khách B có giỏ <code>[7, 3]</code>. A khoá dòng 3
          rồi với sang 7; B khoá dòng 7 rồi với sang 3. Không ai nhúc nhích được, và cũng không
          ai chịu nhả thứ mình đang giữ. PostgreSQL phát hiện vòng lặp và giết một bên.
        </p>
        <p>
          Hai giỏ hàng đó là như nhau. Chỉ khác ở thứ tự mà code tình cờ khoá chúng. Vậy thì
          làm cho thứ tự đó không thể khác nhau được nữa:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`    for pid in sorted(items):          # <- khoá theo một thứ tự thống nhất toàn hệ thống
        conn.execute("SELECT stock FROM product WHERE id = %s FOR UPDATE", (pid,))`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`           thứ tự khoá món |  deadlock |   giây | kho khớp
---------------------------+-----------+--------+---------
     theo thứ tự trong giỏ |       220 | 132.30 | ✓
      luôn sắp xếp theo id |         0 |   0.89 | ✓`}
        </pre>
        <p>
          Deadlock về không và thanh toán chạy <strong>nhanh hơn 149 lần</strong>. Thứ tự toàn
          phần nào cũng được — sắp theo id, theo SKU, theo gì cũng được — miễn là mọi
          transaction trong hệ thống dùng chung một thứ tự. Nếu hai đường code khoá cùng các
          bảng theo thứ tự khác nhau, bạn đang có sẵn lỗi này chờ nổ.
        </p>
        <p>
          Lưu ý rằng nó chỉ nổ khi có tranh chấp thật với các giỏ hàng chồng lấn nhau. Nó sẽ
          không hiện ra khi test ở máy, cũng không hiện ra trên staging. Nó hiện ra vào ngày mở
          bán.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Trường hợp pessimistic lock đơn giản là không dùng được</h3>
        <p>
          Giờ tới luồng thật sự chạy ngoài đời: giữ hàng, đẩy khách sang cổng thanh toán, chờ
          cổng trả lời, rồi xác nhận đơn.
        </p>
        <p>
          Nhìn lại xem khoá dòng gắn vào cái gì. Nó sống từ lúc{" "}
          <code>SELECT ... FOR UPDATE</code> cho tới <code>COMMIT</code>, và không có cách nào
          giữ nó bên ngoài một transaction. Vậy nên giữ hàng suốt lúc gọi cổng thanh toán đồng
          nghĩa với giữ một transaction mở — tức là giữ một{" "}
          <strong>connection database</strong> — đúng bằng khoảng thời gian nhà cung cấp thanh
          toán cần để trả lời.
        </p>
        <p>
          Connection thì luôn là một pool nhỏ và cố định. Tám lượt thanh toán đồng thời, pool
          bốn connection, 200 sản phẩm khác nhau nên xung đột thật sự rất hiếm:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Cổng mất</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Chiến lược</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">đơn/giây</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">tổng giây</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">retry</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">50 ms</td><td className="p-3">pessimistic</td><td className="p-3">67.6</td><td className="p-3">1.42</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-200"><td className="p-3">50 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">132.9</td><td className="p-3">0.72</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">200 ms</td><td className="p-3">pessimistic</td><td className="p-3">19.1</td><td className="p-3">5.01</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-200"><td className="p-3">200 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">37.8</td><td className="p-3">2.54</td><td className="p-3">0</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">500 ms</td><td className="p-3">pessimistic</td><td className="p-3">7.9</td><td className="p-3">12.22</td><td className="p-3">0</td></tr>
              <tr><td className="p-3">500 ms</td><td className="p-3">optimistic</td><td className="p-3 text-emerald-700">15.6</td><td className="p-3">6.15</td><td className="p-3">0</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Optimistic nhanh hơn <strong>đúng 2 lần ở mọi độ trễ của cổng, với 0 lần thử lại.</strong>{" "}
          Không một xung đột nào xảy ra trong bất kỳ lần chạy nào.
        </p>
        <p>
          Con số 2× không phải trùng hợp — đó là tám khách chia cho bốn connection. Pessimistic
          chiếm một connection suốt cả cuộc gọi tới cổng, nên chỉ bốn lượt thanh toán chạy được
          cùng lúc. Optimistic trả connection lại trước khi gọi cổng:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`# đọc version, rồi TRẢ connection về pool
conn = pool.acquire()
stock, v = conn.execute("SELECT stock, version FROM product WHERE id = %s", (pid,)).fetchone()
pool.release(conn)

pay(gateway_ms)                        # không giữ gì cả: không lock, không connection

# xác nhận, nhưng chỉ khi không ai đổi dòng đó lúc mình đi vắng
conn = pool.acquire()
n = conn.execute(
    "UPDATE product SET stock = %s, version = version + 1 "
    "WHERE id = %s AND version = %s",  # <- toàn bộ cơ chế optimistic
    (stock - 1, pid, v),
).rowcount
pool.release(conn)
# n == 0 -> người khác mua trước rồi: đọc lại và thử lại`}
        </pre>
        <p>
          Đây chính là trường hợp lời khuyên thông thường trả lời sai. &ldquo;Ở đây xung đột
          hiếm nên chọn gì cũng không khác mấy&rdquo; sẽ dẫn bạn tới bản pessimistic trông đơn
          giản hơn, và mất một nửa throughput. Tệ hơn, triệu chứng hiện ra là cạn connection
          pool — thứ nhìn chẳng giống vấn đề về khoá chút nào khi bạn đang nhìn nó giữa đợt mở
          bán.
        </p>
        <p>
          Và nếu quãng chờ là một con người chứ không phải một cái cổng — khách ngồi ở trang
          thanh toán hai phút — thì pessimistic lock không phải là chậm, nó là{" "}
          <strong>bất khả thi</strong>. Bạn không thể giữ một transaction database mở hai phút
          cho mỗi khách.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. Cái giá của optimistic khi món hàng thật sự hot</h3>
        <p>
          Optimistic lock có chế độ hỏng của riêng nó, và đó đúng là kịch bản ngược lại: tất cả
          cùng tranh nhau một dòng. Quay lại đợt flash sale ban đầu — 200 người mua, một sản
          phẩm:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  3. Pessimistic: SELECT ... FOR UPDATE
     đã bán 100 đơn | kho còn 0 | khớp
     0.40 giây

  4. Optimistic: cột version + thử lại
     đã bán 100 đơn | kho còn 0 | khớp
     0.53 giây | 2136 lần thử lại`}
        </pre>
        <p>
          Cả hai đều đúng. Nhưng optimistic đã đốt <strong>2136 lượt thử hỏng</strong> để đặt
          được 100 đơn — hai mươi mốt transaction bị vứt đi cho mỗi chiếc áo bán ra. Mỗi lượt
          đều đọc dòng, làm việc, thua cuộc đua, rồi bắt đầu lại từ đầu.
        </p>
        <p>
          Đó là khác biệt cấu trúc giữa hai bên, gói trong một câu:{" "}
          <strong>pessimistic biến tranh chấp thành sự chờ đợi; optimistic biến nó thành công
          sức bị vứt đi.</strong> Chờ đợi thì có giới hạn và công bằng. Công sức bị vứt thì cộng
          dồn — càng nhiều người tranh nhau, càng nhiều người thua, và người thua lập tức quay
          lại tranh tiếp.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. Còn một lựa chọn nữa, trên PostgreSQL</h3>
        <p>
          Bạn không bắt buộc phải tự tay duy trì cột <code>version</code>. Nâng mức isolation
          lên và PostgreSQL sẽ tự làm đúng việc phát hiện đó cho bạn:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`conn.isolation_level = psycopg.IsolationLevel.REPEATABLE_READ

  T1 đọc stock 100, T2 đọc stock 100
  T1 ghi 99, COMMIT
  T2 ghi -> SerializationFailure: could not serialize access due to concurrent update
  T2 thử lại: đọc 99, ghi 98, COMMIT`}
        </pre>
        <p>
          Cùng ngữ nghĩa với cột version, không đổi schema, và — lợi ích thật sự — không có
          đường cập nhật nào có thể lặng lẽ quên gắn{" "}
          <code>AND version = ?</code> rồi âm thầm đưa lỗi quay lại. Bạn vẫn cần vòng thử lại;
          lỗi tới dưới dạng một exception thay vì <code>rowcount == 0</code>.
        </p>
        <p>
          Nhân tiện, một điều đáng biết: PostgreSQL cài Repeatable Read bằng{" "}
          <em>snapshot isolation</em>, không phải bằng read lock, và Repeatable Read của nó đã
          chặn luôn phantom read — mạnh hơn mức chuẩn SQL yêu cầu. Bảng isolation level mà phần
          lớn tài liệu chép lại là bảng của chuẩn SQL, không phải của PostgreSQL.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">8. Khoá chỉ bảo vệ được một tầng</h3>
        <p>
          Toàn bộ phần trên đã ngầm giả định rằng đơn hàng đi thẳng từ người mua vào database.
          Nó không đi như vậy. Trong bất kỳ hệ thống thật nào, đường đi gần với thế này hơn:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`trình duyệt -> load balancer -> N app server -> queue -> M worker -> database`}
        </pre>
        <p>
          Mỗi mũi tên ở đó là một chỗ mà cùng một đơn hàng logic có thể biến thành hai. Trình
          duyệt gửi lại một request bị timeout. Load balancer đẩy lần gửi lại đó sang một app
          server khác, nên mutex trong tiến trình chẳng bảo vệ được gì. Và queue — SQS,
          RabbitMQ, Kafka — bảo đảm giao <strong>ít nhất một lần</strong> (at-least-once). Khi
          worker chết giữa lúc xử lý, hoặc ack bị mất, tin nhắn được giao lại. Đó là queue
          đang chạy đúng, không phải lỗi.
        </p>
        <p>
          Vậy: giữ nguyên pessimistic lock ở §3, viết hoàn toàn đúng, và để 25 trong 100 tin
          nhắn bị giao lại.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`QUEUE GIAO LẠI TIN NHẮN — kho 200, 100 đơn thật, 8 worker

  A. Chỉ dùng SELECT ... FOR UPDATE  (khoá dòng hoàn toàn đúng)
     queue giao 125 tin nhắn (25 tin bị giao lại)
     -> tạo 125 dòng đơn hàng   (đúng phải là 100)
     -> kho còn 75              (đúng phải là 100)
     -> MẤT 25 áo không ai mua, và 25 khách bị tính tiền hai lần`}
        </pre>
        <p>
          Cái khoá đã làm đúng việc của nó. Cả hai lần giao của cùng một đơn đều lấy được
          khoá, lần lượt nối nhau, mỗi lần đọc ra một giá trị tồn kho nhất quán, mỗi lần trừ
          đúng một. Không có cuộc đua nào, không có lost update nào. Hàng chỉ đơn giản là biến
          mất.
        </p>
        <p>
          Đây là chỗ phân biệt quan trọng, và rất dễ bỏ sót vì cả hai thứ đều được gọi là
          &ldquo;khoá&rdquo;:{" "}
          <strong>khoá dòng tuần tự hoá việc truy cập vào một dòng. Nó không làm cho một thao
          tác chỉ xảy ra một lần.</strong> Chống bán vượt kho cần cái thứ nhất. Chống giao lại
          tin nhắn cần cái thứ hai. Đó là hai bảo đảm khác nhau, và không mức isolation nào
          cho bạn cái thứ hai.
        </p>
        <p>
          Bảo đảm thứ hai nằm ở một tầng khác — trên một khoá nghiệp vụ do client sinh ra và
          đi kèm request qua mọi chặng:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE TABLE orders (order_id text PRIMARY KEY, product_id int NOT NULL)

def handle(conn, order_id):
    n = conn.execute(
        "INSERT INTO orders (order_id, product_id) VALUES (%s, 0) "
        "ON CONFLICT (order_id) DO NOTHING",     # <- chốt chặn, ở khoá nghiệp vụ
        (order_id,),
    ).rowcount
    if n == 0:
        conn.commit()                            # đã xử lý rồi: KHÔNG trừ kho lần nữa
        return
    conn.execute("UPDATE product SET stock = stock - 1 WHERE id = 0 AND stock > 0")
    conn.commit()`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`  B. Chốt ở khoá nghiệp vụ: INSERT ... ON CONFLICT DO NOTHING
     queue giao 125 tin nhắn (25 tin bị giao lại)
     -> tạo 100 dòng đơn hàng   đúng
     -> kho còn 100              đúng`}
        </pre>
        <p>
          Chú ý câu insert đứng <em>trước</em> và câu trừ kho đứng sau, trong cùng một
          transaction. Ràng buộc unique mới là thứ quyết định lần giao này có phải lần đầu hay
          không; việc trừ kho chỉ chạy nếu đúng là lần đầu. Đảo thứ tự lại là bạn quay về đúng
          mẫu kiểm-tra-rồi-hành-động, tức là lỗi ở §1 mặc áo khác.
        </p>
        <p>Mỗi tầng có hiểm hoạ riêng, và cơ chế riêng:</p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 w-[28%] font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Tầng</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Một thao tác thành hai vì</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Thứ thật sự giúp được</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">Trình duyệt / client</td><td className="p-3 align-top">bấm hai lần, gửi lại sau timeout</td><td className="p-3 align-top">idempotency key do client sinh ra</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">LB → N app server</td><td className="p-3 align-top">lần gửi lại rơi vào instance khác</td><td className="p-3 align-top">chốt chặn phải nằm ngoài tiến trình</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3 align-top">Queue → M worker</td><td className="p-3 align-top">giao lại theo at-least-once</td><td className="p-3 align-top">khử trùng lặp theo khoá nghiệp vụ</td></tr>
              <tr><td className="p-3 align-top">Database</td><td className="p-3 align-top">transaction đan xen nhau</td><td className="p-3 align-top">câu lệnh nguyên tử, hoặc khoá dòng</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Idempotency key không thay thế bất cứ thứ gì ở §2 tới §7 — nó chặn một chế độ hỏng
          khác. Hai khách hàng <em>khác nhau</em> tranh chiếc áo cuối là bài toán đồng thời, và
          cần các cơ chế ở tầng DB. <em>Cùng một</em> khách hàng tới hai lần là bài toán danh
          tính, và cần khoá unique. Một hệ thống chỉ làm một trong hai không phải là an toàn
          một nửa; nó hở hoàn toàn ở nửa còn lại.
        </p>
        <h3 className="font-sans font-bold text-lg text-black pt-4">9. Trình tự quyết định</h3>
        <p>Hỏi lần lượt những câu này thì bạn sẽ không cần đoán về xác suất xung đột:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Cùng một request có thể tới hai lần không?</strong> Qua một lần gửi lại,
            qua queue, hay do bấm hai lần — có, hoàn toàn có thể. Đặt một khoá nghiệp vụ unique
            trên đường ghi trước khi nghĩ tới khoá gì cả (§8). Không khoá nào và không mức
            isolation nào thay thế được nó.
          </li>
          <li>
            <strong>Câu cập nhật có gói được vào một câu SQL không?</strong> Nếu có thì viết như
            vậy và không dùng khoá gì cả. <code>UPDATE ... WHERE stock &gt; 0</code> cộng với{" "}
            <code>rowcount</code> giải quyết trọn vẹn bài toán tồn kho một món (§2).
          </li>
          <li>
            <strong>Công việc có nằm gọn trong một transaction từ đầu tới cuối không?</strong>{" "}
            Nếu nó trải qua nhiều request, chờ một con người, hoặc gọi dịch vụ bên ngoài —
            pessimistic không dùng được, vì nó sẽ giữ một connection suốt thời gian đó (§5). Dùng
            optimistic.
          </li>
          <li>
            <strong>Trong một transaction, đụng tới nhiều dòng?</strong> Dùng{" "}
            <code>FOR UPDATE</code> — và khoá theo thứ tự đã sắp xếp, thống nhất toàn hệ thống,
            nếu không bạn sẽ gặp cái giá 149 lần vào ngày mở bán (§3, §4).
          </li>
          <li>
            <strong>Trong một transaction, tất cả cùng tranh một dòng?</strong> Pessimistic. Chờ
            có giới hạn thắng 2136 lượt thử bị vứt bỏ (§6).
          </li>
          <li>
            <strong>Trên PostgreSQL, cân nhắc Repeatable Read</strong> thay cho cột version tự
            làm bằng tay (§7).
          </li>
        </ul>
        <p>
          Quy tắc thông thường — optimistic khi xung đột hiếm, pessimistic khi xung đột nhiều —
          không hẳn sai, mà là hỏi quá sớm. Nó trả lời câu cuối cùng trong danh sách trên. Hai
          câu đầu mới là thứ quyết định kết quả trong phần lớn trường hợp, và cả hai đều không
          liên quan gì tới chuyện va chạm có khả năng xảy ra cao hay thấp.
        </p>
        <p className="text-zinc-500 text-[13px]">
          Đo trên PostgreSQL 17.11 (Alpine, Docker) qua psycopg 3.2.13. Con số throughput tuyệt
          đối là số của máy laptop và tự nó không có nhiều ý nghĩa — điểm chính là các tỉ lệ và
          hình dạng của sự suy sụp, và những thứ đó thì tái hiện được.
        </p>
      </div>
      ),
    },
  },
  {
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
  },
  {
    slug: "silent-missing-await-run-in-executor",
    date: "2026-08-21",
    category: "Python / asyncio",
    availableIn: ["en", "vi"],
    title: {
      en: "Silent by design: why a missing await on run_in_executor survives review",
      vi: "Không một dòng cảnh báo: vì sao lỗi thiếu await ở run_in_executor lọt qua mọi vòng review",
    },
    readTime: { en: "9 min read", vi: "9 phút đọc" },
    description: {
      en: "Forgetting await on a coroutine is loud. Forgetting it on run_in_executor is completely silent — and shared global state makes the bug heal itself after the first call, which is exactly why nobody catches it.",
      vi: "Quên await một coroutine thì Python kêu. Quên await run_in_executor thì im hoàn toàn — và state global khiến lỗi tự khỏi sau lần gọi đầu, đúng lý do không ai bắt được nó.",
    },
    content: {
      en: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          A background service ran fine for weeks. Every so often one processing cycle
          would act on data that was <strong>incomplete</strong> — a few records simply
          missing. No exception. No warning. Nothing in the logs. Restarting made it go
          away, so for a long time it was filed under &ldquo;probably the network&rdquo;.
        </p>
        <p>
          The cause was two lines that look completely ordinary, and a language behaviour
          that most Python developers assume works the other way around.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Fifteen lines that reproduce it</h3>
        <p>
          This is not the production code — it is the smallest thing I could write that
          fails the same way. Run it yourself; that is the point.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import asyncio, time
from concurrent.futures import ThreadPoolExecutor

state: dict[str, str] = {}

def load(key: str) -> None:          # stands in for a DB query
    time.sleep(0.05)
    state[key] = "loaded"

async def build_state(loop, ex) -> dict[str, str]:
    loop.run_in_executor(ex, load, "agents")      # <- no await
    loop.run_in_executor(ex, load, "equipment")   # <- no await
    return dict(state)                            # returns while threads still run

async def main():
    ex = ThreadPoolExecutor(4)
    for i in range(5):
        print(f"run {i+1}: {await build_state(asyncio.get_running_loop(), ex)}")
        await asyncio.sleep(0.06)

asyncio.run(main())`}
        </pre>
        <p>Output:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`run 1: {}
run 2: {'agents': 'loaded', 'equipment': 'loaded'}
run 3: {'agents': 'loaded', 'equipment': 'loaded'}
run 4: {'agents': 'loaded', 'equipment': 'loaded'}
run 5: {'agents': 'loaded', 'equipment': 'loaded'}`}
        </pre>
        <p>
          The first call returns empty. Every call after it looks correct. There is no
          error anywhere.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Why Python stays quiet</h3>
        <p>
          Most of us learned that forgetting <code>await</code> is loud — Python emits{" "}
          <code>RuntimeWarning: coroutine was never awaited</code>. That is true, and it is
          also the reason this bug is so easy to miss: the warning belongs to{" "}
          <strong>coroutines</strong>, and <code>run_in_executor</code> does not return one.
          It returns a <strong>Future</strong>, and Futures have no equivalent warning.
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="p-3 w-[38%] font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                        What you forgot to await
                      </th>
                      <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                        What Python tells you
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px]">
                    <tr className="border-b border-zinc-200">
                      <td className="p-3 align-top"><code>a coroutine</code></td>
                      <td className="p-3 align-top text-amber-700">RuntimeWarning: coroutine ... was never awaited</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top"><code>run_in_executor(...)</code></td>
                      <td className="p-3 align-top text-zinc-400 italic">nothing at all</td>
                    </tr>
                  </tbody>
                </table>
        </div>
        <p>
          I checked this on Python 3.9 and on 3.14: identical behaviour. This is not a
          rough edge of an old release that has since been fixed.
        </p>
        <p>
          One caveat worth stating precisely, because it is easy to overclaim here: if the
          function you hand to the executor <em>raises</em>, Python does eventually print{" "}
          <code>Future exception was never retrieved</code>. But it prints it when the Future
          is collected — not at the call site, not in the stack that caused it, and easily
          buried in a long-running server. And in the case that actually hurts, the function
          does not raise at all. It succeeds. It is just late.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Why nobody catches it in review</h3>
        <p>
          This is the part I find genuinely interesting. Look again at the output: the first
          call is wrong, and then the bug appears to <strong>heal itself</strong>.
        </p>
        <p>
          It heals because <code>state</code> is a module-level global that survives between
          calls. By the second call the threads from the first call have finished and
          populated it. Call two is not reading its own data — it is reading{" "}
          <strong>leftovers from call one</strong>.
        </p>
        <p>
          Run the same code with a fresh state object each time and the disguise falls away:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`state GLOBAL (kept between calls):  [0, 2, 2, 2]   <- only the first call is wrong
state LOCAL  (reset every call):    [0, 0, 0, 0]   <- wrong every time`}
        </pre>
        <p>
          That is the whole reason this class of bug survives: you hit it once, reload, and
          it works. It does not reproduce on demand, so it never becomes a ticket. It waits
          for a cold start in production.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. The obvious fix, and why it is not enough</h3>
        <p>Collect the futures and await them:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`futures = [
    loop.run_in_executor(ex, load, "agents"),
    loop.run_in_executor(ex, load, "equipment"),
]
await asyncio.gather(*futures)
return dict(state)`}
        </pre>
        <p>
          This fixes the timing. It does not fix the second problem, and the second problem
          is worse.
        </p>
        <p>
          If one loader raises, <code>gather()</code> re-raises — good. But the other loaders
          have <strong>already mutated the shared state</strong>. You are now left with a
          global that is half-updated, and it stays that way. The next request does not
          fail; it quietly reads a state that is part-new and part-old. A crash that leaves
          bad data behind is worse than a crash.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Build beside, then swap</h3>
        <p>
          The fix is not to add a backup-and-restore path around the mutation. It is to stop
          mutating the live object at all:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`async def build_state(loop, ex) -> dict[str, str]:
    global state
    new_state: dict[str, str] = {}                  # build beside the live one

    def load_into(target, key):
        time.sleep(0.05)
        target[key] = "loaded"

    await asyncio.gather(
        loop.run_in_executor(ex, load_into, new_state, "agents"),
        loop.run_in_executor(ex, load_into, new_state, "equipment"),
    )

    state = new_state                               # swap only after all succeed
    return dict(state)`}
        </pre>
        <p>
          If anything fails, <code>gather()</code> raises before the assignment, and the
          previous state is still intact and still consistent. Readers never observe a
          half-built object, because the only thing that ever changes for them is one
          reference.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. The general shape</h3>
        <p>
          None of this is new — it is copy-on-write, and it turns up everywhere once you
          recognise it. A git commit does not edit your previous commit. A blue-green deploy
          does not upgrade the running fleet in place. <code>os.rename()</code> is atomic
          precisely so that a writer can build a file beside the real one and then move it
          over.
        </p>
        <p>The two ingredients that made the original bug are worth naming, because they travel together:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Fire-and-forget concurrency</strong> — work started but never joined.</li>
          <li><strong>Shared mutable state</strong> — so partial results outlive the request that produced them.</li>
        </ul>
        <p>
          Either alone is survivable. Together they produce corruption with no error attached
          to it, and a symptom that disappears when you look at it.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. How to check your own code</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Grep for <code>run_in_executor</code> and check every call site: is the returned
            Future stored, gathered, or awaited? A bare call on its own line is the smell.
          </li>
          <li>
            The same applies to <code>asyncio.create_task()</code> and{" "}
            <code>ensure_future()</code> — same pattern, same silence.
          </li>
          <li>
            <strong>Reset the shared state at the start of each call and run your tests.</strong>{" "}
            If results suddenly break every time instead of only on the first run, you have
            just made a hidden bug reproducible — that is the useful outcome, not a
            regression.
          </li>
        </ul>
        <p>
          I found this while auditing an async data-loading path in a scheduling service.
          The report I wrote at the time said &ldquo;add the missing await&rdquo;. It took a
          second pass to notice that the missing await was the smaller half of the problem.
        </p>
      </div>
      ),
      vi: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Một service nền chạy ổn suốt nhiều tuần. Thỉnh thoảng có một vòng xử lý làm việc
          trên dữ liệu <strong>thiếu</strong> — vài bản ghi đơn giản là không có. Không
          exception. Không cảnh báo. Log sạch trơn. Restart thì hết, nên suốt một thời gian
          dài nó bị xếp vào loại &ldquo;chắc do mạng&rdquo;.
        </p>
        <p>
          Nguyên nhân là hai dòng trông hoàn toàn bình thường, cộng với một hành vi của
          Python mà phần lớn lập trình viên tin là ngược lại.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Mười lăm dòng tái hiện</h3>
        <p>
          Đây không phải code production — đây là thứ nhỏ nhất tôi viết được để nó hỏng theo
          đúng cách đó. Bạn chạy thử đi; đó mới là điểm chính.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import asyncio, time
from concurrent.futures import ThreadPoolExecutor

state: dict[str, str] = {}

def load(key: str) -> None:          # thay cho một truy vấn DB
    time.sleep(0.05)
    state[key] = "loaded"

async def build_state(loop, ex) -> dict[str, str]:
    loop.run_in_executor(ex, load, "agents")      # <- thiếu await
    loop.run_in_executor(ex, load, "equipment")   # <- thiếu await
    return dict(state)                            # trả về khi thread còn chạy

async def main():
    ex = ThreadPoolExecutor(4)
    for i in range(5):
        print(f"lần {i+1}: {await build_state(asyncio.get_running_loop(), ex)}")
        await asyncio.sleep(0.06)

asyncio.run(main())`}
        </pre>
        <p>Kết quả:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`lần 1: {}
lần 2: {'agents': 'loaded', 'equipment': 'loaded'}
lần 3: {'agents': 'loaded', 'equipment': 'loaded'}
lần 4: {'agents': 'loaded', 'equipment': 'loaded'}
lần 5: {'agents': 'loaded', 'equipment': 'loaded'}`}
        </pre>
        <p>
          Lần gọi đầu trả về rỗng. Mọi lần sau trông đúng. Không có lỗi ở đâu cả.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Vì sao Python im lặng</h3>
        <p>
          Phần lớn chúng ta học rằng quên <code>await</code> là Python sẽ kêu:{" "}
          <code>RuntimeWarning: coroutine was never awaited</code>. Điều đó đúng — và cũng
          chính là lý do lỗi này dễ lọt: cảnh báo đó thuộc về <strong>coroutine</strong>, mà{" "}
          <code>run_in_executor</code> không trả về coroutine. Nó trả về{" "}
          <strong>Future</strong>, và Future không có cảnh báo tương đương.
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="p-3 w-[38%] font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                        Bạn quên await cái gì
                      </th>
                      <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                        Python báo gì
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px]">
                    <tr className="border-b border-zinc-200">
                      <td className="p-3 align-top"><code>một coroutine</code></td>
                      <td className="p-3 align-top text-amber-700">RuntimeWarning: coroutine ... was never awaited</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top"><code>run_in_executor(...)</code></td>
                      <td className="p-3 align-top text-zinc-400 italic">không gì cả</td>
                    </tr>
                  </tbody>
                </table>
        </div>
        <p>
          Tôi kiểm trên Python 3.9 và 3.14: hành vi giống hệt nhau. Đây không phải khuyết
          điểm của một bản cũ đã được vá.
        </p>
        <p>
          Có một điểm cần nói cho chính xác, vì rất dễ nói quá ở chỗ này: nếu hàm bạn đưa cho
          executor <em>ném exception</em>, Python cuối cùng vẫn in{" "}
          <code>Future exception was never retrieved</code>. Nhưng nó in lúc Future bị thu
          hồi — không phải tại chỗ gọi, không nằm trong stack gây ra lỗi, và rất dễ chìm
          nghỉm trong một server chạy dài. Còn trong trường hợp thật sự gây đau, hàm đó{" "}
          <strong>không ném gì cả</strong>. Nó chạy thành công. Chỉ là muộn.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Vì sao không ai bắt được khi review</h3>
        <p>
          Đây mới là phần tôi thấy đáng nói. Nhìn lại kết quả: lần gọi đầu sai, rồi lỗi có vẻ{" "}
          <strong>tự khỏi</strong>.
        </p>
        <p>
          Nó tự khỏi vì <code>state</code> là biến global cấp module, sống sót giữa các lần
          gọi. Tới lần thứ hai thì các thread của lần đầu đã chạy xong và điền đầy nó. Lần
          hai không đọc dữ liệu của chính nó — nó đọc{" "}
          <strong>đồ thừa lại của lần một</strong>.
        </p>
        <p>
          Chạy đúng code đó nhưng reset state mỗi lần, lớp nguỵ trang rơi ra:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`state GLOBAL (giữ giữa các lần):  [0, 2, 2, 2]   <- chỉ lần đầu sai
state CỤC BỘ (reset mỗi lần):     [0, 0, 0, 0]   <- sai mọi lần`}
        </pre>
        <p>
          Đó là toàn bộ lý do lớp lỗi này sống sót: bạn gặp một lần, tải lại, thấy chạy được.
          Nó không tái hiện theo yêu cầu, nên không bao giờ thành ticket. Nó nằm chờ một lần
          khởi động nguội trên production.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Cách sửa hiển nhiên, và vì sao chưa đủ</h3>
        <p>Gom future lại rồi await:</p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`futures = [
    loop.run_in_executor(ex, load, "agents"),
    loop.run_in_executor(ex, load, "equipment"),
]
await asyncio.gather(*futures)
return dict(state)`}
        </pre>
        <p>
          Cách này sửa được vấn đề thời điểm. Nó không sửa được vấn đề thứ hai, và vấn đề thứ
          hai tệ hơn.
        </p>
        <p>
          Nếu một loader ném exception, <code>gather()</code> ném lại — tốt. Nhưng các loader
          khác <strong>đã kịp mutate state dùng chung</strong>. Bạn còn lại một biến global
          cập nhật dở dang, và nó ở nguyên trạng thái đó. Request kế tiếp không lỗi; nó lặng
          lẽ đọc một state nửa mới nửa cũ. Một cú crash để lại dữ liệu hỏng còn tệ hơn cú
          crash.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Dựng bên cạnh, rồi đổi con trỏ</h3>
        <p>
          Cách sửa không phải là thêm đường backup-rồi-restore quanh chỗ mutate. Cách sửa là
          đừng mutate đối tượng đang sống nữa:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`async def build_state(loop, ex) -> dict[str, str]:
    global state
    new_state: dict[str, str] = {}                  # dựng bên cạnh bản đang sống

    def load_into(target, key):
        time.sleep(0.05)
        target[key] = "loaded"

    await asyncio.gather(
        loop.run_in_executor(ex, load_into, new_state, "agents"),
        loop.run_in_executor(ex, load_into, new_state, "equipment"),
    )

    state = new_state                               # chỉ đổi khi TẤT CẢ đã xong
    return dict(state)`}
        </pre>
        <p>
          Nếu có gì hỏng, <code>gather()</code> ném trước dòng gán, và state cũ vẫn nguyên
          vẹn, vẫn nhất quán. Người đọc không bao giờ thấy một đối tượng dựng dở, vì thứ duy
          nhất thay đổi với họ là một tham chiếu.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">6. Hình dạng chung</h3>
        <p>
          Chẳng có gì mới ở đây — đó là copy-on-write, và nhận ra rồi thì thấy nó ở khắp nơi.
          Một commit git không sửa commit trước đó. Blue-green deploy không nâng cấp tại chỗ
          đám máy đang chạy. <code>os.rename()</code> nguyên tử chính là để người ghi dựng
          file bên cạnh file thật rồi mới dời qua.
        </p>
        <p>Hai thành phần tạo nên lỗi gốc đáng được gọi tên, vì chúng hay đi cùng nhau:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Concurrency kiểu bắn-rồi-quên</strong> — khởi động việc nhưng không bao giờ chờ.</li>
          <li><strong>State dùng chung, sửa được</strong> — nên kết quả dở dang sống lâu hơn cái request sinh ra nó.</li>
        </ul>
        <p>
          Mỗi thứ riêng lẻ đều còn chịu được. Đi cùng nhau, chúng tạo ra dữ liệu hỏng mà
          không kèm lỗi nào, và một triệu chứng biến mất ngay khi bạn nhìn vào.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. Cách tự soi code của bạn</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Grep <code>run_in_executor</code> rồi soi từng chỗ gọi: Future trả về có được giữ,
            gom, hay await không? Một lời gọi trần đứng riêng một dòng là dấu hiệu.
          </li>
          <li>
            Điều tương tự áp cho <code>asyncio.create_task()</code> và{" "}
            <code>ensure_future()</code> — cùng mẫu, cùng sự im lặng.
          </li>
          <li>
            <strong>Reset state dùng chung ở đầu mỗi lần gọi rồi chạy test.</strong> Nếu kết
            quả bỗng sai mọi lần thay vì chỉ lần đầu, bạn vừa biến một lỗi ẩn thành lỗi tái
            hiện được — đó là kết quả tốt, không phải hồi quy.
          </li>
        </ul>
        <p>
          Tôi gặp chuyện này khi rà một đường nạp dữ liệu bất đồng bộ trong một service lập
          lịch. Báo cáo tôi viết lúc đó ghi &ldquo;thêm await còn thiếu&rdquo;. Phải tới lượt
          đọc thứ hai mới nhận ra: cái await còn thiếu mới là nửa nhỏ của vấn đề.
        </p>
      </div>
      ),
    },
  },
  {
    slug: "shopee-api-integration",
    date: "2026-05-23",
    category: "API Integration",
    availableIn: ["vi"],
    title: { en: "Integrating Shopee Open API v2 with Node.js / TypeScript", vi: "Hướng dẫn chi tiết tích hợp Shopee API v2 bằng Node.js / TypeScript" },
    readTime: { en: "8 min read", vi: "8 phút đọc" },
    description: { en: "Setting up the connection, handling the seller auth flow, refreshing tokens automatically, and calling the order APIs with shopee-api-client.", vi: "Khám phá cách thiết lập kết nối, xử lý Seller Auth Flow, tự động quản lý Token và gọi API đơn hàng bằng thư viện shopee-api-client." },
    content: sameForBothLocales(() => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Tích hợp cổng <strong>Shopee Open API v2</strong> luôn là một trong những thử thách lớn đối với lập trình viên thương mại điện tử do tính phức tạp của hệ thống quản lý Token (Oauth 2.0) và cơ chế mã hóa chữ ký số (Request Signature).
        </p>
        <p>
          Trong bài viết này, chúng ta sẽ cùng phân tích luồng vận hành chuẩn hóa để tích hợp Shopee API vào hệ thống quản lý đơn hàng bằng Node.js và TypeScript thông qua gói thư viện <code>shopee-api-client</code>.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Khởi tạo Mô-đun</h3>
        <p>
          Để bắt đầu gọi các endpoint của Shopee, trước hết chúng ta cần có thông tin <strong>Partner ID</strong> và <strong>Partner Key</strong> được cấp bởi Shopee Open Platform. Khởi tạo đối tượng quản lý như sau:
        </p>

        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import { ShopeeModule } from "shopee-api-client";

const shopee = new ShopeeModule({
  partnerId: Number(process.env.SHOPEE_PARTNER_ID),
  partnerKey: process.env.SHOPEE_PARTNER_KEY!,
  shopId: process.env.SHOPEE_SHOP_ID,       // (Tùy chọn khi khởi tạo)
  accessToken: process.env.SHOPEE_ACCESS_TOKEN, // (Sẽ cập nhật sau khi auth)
  refreshToken: process.env.SHOPEE_REFRESH_TOKEN,
});`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Luồng Ủy quyền Seller (Seller Authorization Flow)</h3>
        <p>
          Đối với các dữ liệu bảo mật (đơn hàng, thông tin khách hàng, kho hàng), Shopee yêu cầu chủ cửa hàng (Seller) phải ủy quyền cho ứng dụng của bạn. Quy trình gồm 4 bước:
        </p>

        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-2xs font-sans text-xs space-y-2">
          <p className="font-bold text-zinc-800">Quy trình Ủy Quyền Oauth 2.0:</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-zinc-600">
            <li><strong>Tạo đường dẫn ủy quyền:</strong> Sử dụng phương thức sinh link có kèm redirect URL.</li>
            <li><strong>Redirect Seller:</strong> Đưa seller đến trang đăng nhập Shopee để bấm xác nhận.</li>
            <li><strong>Nhận Callback:</strong> Shopee trả về redirect URL kèm mã <code>code</code> và <code>shop_id</code>.</li>
            <li><strong>Đổi Token:</strong> Gửi request trao đổi mã <code>code</code> lấy cặp token truy cập.</li>
          </ol>
        </div>

        <p>
          Dưới đây là cách triển khai sinh link ủy quyền:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// Sinh liên kết ủy quyền chuyển hướng
const { url } = await shopee.generateAuthLink(
  "https://your-app.com/shopee/callback"
);
// Đưa seller truy cập vào url này để hoàn tất xác nhận.`}
        </pre>

        <p>
          Khi seller chấp thuận, họ sẽ được chuyển về route callback. Chúng ta tiến hành bắt lấy mã code và trao đổi lấy token:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`app.get("/shopee/callback", async (req, res) => {
  const code = req.query.code as string;
  const shopId = req.query.shop_id as string;

  const client = new ShopeeModule({
    partnerId: Number(process.env.SHOPEE_PARTNER_ID),
    partnerKey: process.env.SHOPEE_PARTNER_KEY!,
    shopId,
  });

  // Gửi API đổi lấy access token và refresh token
  const tokenData = await client.fetchToken(code);
  
  // Lưu tokenData vào cơ sở dữ liệu để tái sử dụng
  // tokenData chứa: access_token, refresh_token, expire_in
  res.json(tokenData);
});`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Quản lý Vòng đời Token (Token Lifecycle Management)</h3>
        <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
          Lưu ý quan trọng: Shopee Access Token chỉ có thời hạn 4 tiếng. Refresh Token có thời hạn 30 ngày. Mỗi khi sử dụng Refresh Token để đổi Access Token mới, Shopee cũng sẽ trả về một Refresh Token mới. Bạn phải ghi đè Refresh Token cũ bằng token mới này ngay lập tức!
        </blockquote>

        <p>
          Cơ chế refresh token được tự động hóa qua thư viện như sau:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`const client = new ShopeeModule({
  partnerId: Number(process.env.SHOPEE_PARTNER_ID),
  partnerKey: process.env.SHOPEE_PARTNER_KEY!,
  shopId: "SHOPEE_SHOP_ID",
  refreshToken: "STORED_REFRESH_TOKEN",
});

// Lấy cặp token mới
const token = await client.refreshToken();
console.log(token.access_token, token.refresh_token);`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Lấy Danh sách Đơn hàng (Get Orders)</h3>
        <p>
          Khi token đã sẵn sàng, ta có thể dễ dàng lấy danh sách đơn hàng được tạo hoặc cập nhật trong thời gian gần đây:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// Shorthand: Lấy đơn hàng trong 60 phút qua
const recentOrders = await shopee.getOrders(60);

// Hoặc chi tiết bằng các bộ lọc:
const pendingOrders = await shopee.getOrders({
  beforeMinutes: 120,
  orderStatus: "READY_TO_SHIP",
  timeRangeField: "update_time",
  pageSize: 50,
});`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">5. Kết luận</h3>
        <p>
          Việc đóng gói auth flow và các method gọi API trong thư viện <code>shopee-api-client</code> giúp chúng ta tiết kiệm hàng chục giờ code tay, giảm thiểu rủi ro tính toán sai timestamp hay ký sai thuật toán mã hóa SHA256 phức tạp của Shopee.
        </p>
      </div>
    )),
  },
  {
    slug: "safe-webhook-handling",
    date: "2026-04-15",
    category: "Security",
    availableIn: ["vi"],
    title: { en: "Handling Shopee and TikTok Shop webhook pushes safely", vi: "Xử lý Webhook Push từ Shopee và TikTok Shop một cách an toàn" },
    readTime: { en: "7 min read", vi: "7 phút đọc" },
    description: { en: "Anti-forgery, HMAC-SHA256 signature verification, and keeping webhook response times low.", vi: "Giải thích cơ chế chống giả mạo request, xác thực chữ ký signature HMAC-SHA256 và tối ưu hóa thời gian phản hồi webhook." },
    content: sameForBothLocales(() => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Khi xây dựng hệ thống quản lý e-commerce, việc đồng bộ đơn hàng theo thời gian thực (real-time) là yếu tố sống còn. Cơ chế <strong>Push Mechanism (Webhook)</strong> được sử dụng để sàn đẩy thông báo về máy chủ của bạn mỗi khi đơn hàng thay đổi trạng thái.
        </p>
        <p>
          Tuy nhiên, việc mở một cổng API công khai để nhận dữ liệu từ Internet mang lại nhiều rủi ro bảo mật nghiêm trọng. Kẻ xấu có thể gửi payload giả để đánh dấu đơn hàng đã thanh toán hoặc đã hủy nhằm trục lợi.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Cơ chế Xác Thực Signature</h3>
        <p>
          Shopee gửi thông điệp webhook dưới dạng HTTP POST, kèm theo chữ ký mã hóa nằm trong header <code>Authorization</code>. Chữ ký này được tạo ra bằng thuật toán <strong>HMAC-SHA256</strong> sử dụng <code>partnerKey</code> để ký tên trên tổ hợp:
        </p>
        <div className="bg-zinc-100 p-4 rounded font-mono text-xs text-zinc-800 border border-zinc-200">
          signature = HMAC-SHA256(partnerKey, absolute_callback_url + raw_request_body)
        </div>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Quy Tắc Vàng: Nhận Raw Body</h3>
        <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
          Cảnh báo: Bạn phải đọc req.body dưới dạng buffer thô (Raw Body). Nếu sử dụng middleware express.json() làm định dạng mặc định trước khi kiểm tra chữ ký, các trường trong payload sẽ bị sắp xếp lại thứ tự khóa (key sorting) lúc parse JSON, khiến việc tính toán hash SHA256 bị sai lệch 100%!
        </blockquote>

        <p>
          Dưới đây là cách cấu hình route nhận webhook với Express thô:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`import express from "express";
import { ShopeeModule } from "shopee-api-client";

const app = express();
const shopee = new ShopeeModule({
  partnerId: Number(process.env.SHOPEE_PARTNER_ID),
  partnerKey: process.env.SHOPEE_PARTNER_KEY!,
});

// Sử dụng express.raw để giữ nguyên chuỗi body thô gửi sang
app.post(
  "/shopee/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const callbackUrl = "https://your-app.com/shopee/webhook";
    const signature = req.header("authorization") ?? "";

    // Thực hiện verify chữ ký thô
    const isValid = shopee.verifyPushSignature(
      callbackUrl,
      req.body, // req.body ở đây là Buffer thô
      signature
    );

    if (!isValid) {
      console.warn("Cảnh báo: Webhook signature không hợp lệ!");
      return res.status(401).end();
    }

    // Sau khi verify thành công, parse JSON để xử lý dữ liệu
    const payload = shopee.parsePushPayload(req.body);
    console.log("Xử lý sự kiện code:", payload.code);

    return res.status(204).end();
  }
);`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Chiến thuật phản hồi nhanh: &ldquo;Respond Fast, Fetch Later&rdquo;</h3>
        <p>
          Shopee quy định thời gian timeout cho một request webhook là <strong>3 giây</strong>. Nếu server của bạn xử lý quá chậm (ví dụ: thực hiện ghi đè DB nhiều bảng, kiểm tra logic phức tạp), Shopee sẽ đánh giá request thất bại và liên tục gửi lại webhook (Retry theo chu kỳ 300 giây, 1800 giây, 10800 giây).
        </p>
        <p>
          Để giải quyết vấn đề này, hãy áp dụng mô hình kiến trúc bất đồng bộ:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700">
          <li><strong>Xác thực chữ ký lập tức:</strong> Thực hiện verify signature thô ngay khi nhận request.</li>
          <li><strong>Phản hồi HTTP 200/204:</strong> Trả về phản hồi thành công ngay lập tức để ngắt kết nối với Shopee.</li>
          <li><strong>Xử lý hàng đợi (Background Worker):</strong> Đẩy dữ liệu event vào một Message Queue (Redis, RabbitMQ) hoặc gọi hàm xử lý bất đồng bộ để Worker chạy ngầm, gọi ngược lên API Shopee lấy dữ liệu đơn hàng mới nhất và cập nhật vào DB.</li>
        </ol>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Kết luận</h3>
        <p>
          Bằng cách kết hợp giữa việc kiểm tra <strong>Signature</strong> thô và thiết kế mô hình <strong>Bất đồng bộ</strong>, bạn sẽ xây dựng được một cổng tích hợp Webhook an toàn, chịu tải tốt, và không bao giờ bị nghẽn hay trùng lặp dữ liệu đơn hàng từ các sàn.
        </p>
      </div>
    )),
  },
  {
    slug: "ecommerce-sdk-monorepo",
    date: "2026-03-28",
    category: "Architecture",
    availableIn: ["vi"],
    title: { en: "Building an e-commerce SDK monorepo with npm workspaces", vi: "Xây dựng Monorepo với npm workspaces cho các E-commerce SDKs" },
    readTime: { en: "9 min read", vi: "6 phút đọc" },
    description: { en: "Managing a multi-package project, keeping versions in sync, and streamlining releases with Changesets.", vi: "Cách thiết lập và quản lý dự án multi-package, tự động đồng bộ hóa phiên bản và tối ưu hóa quy trình release bằng Changesets." },
    content: sameForBothLocales(() => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Khi phát triển các bộ công cụ kết nối API đa sàn (Shopee, TikTok Shop, Lazada), việc quản lý mã nguồn dưới dạng các repository riêng biệt thường dẫn đến việc trùng lặp code cấu hình, khó đồng bộ ESLint/TypeScript và khó kiểm thử liên hoàn.
        </p>
        <p>
          Giải pháp tối ưu nhất là gom tất cả các package này vào một kho lưu trữ duy nhất sử dụng mô hình <strong>Monorepo</strong>. Trong bài viết này, chúng ta sẽ xem xét cấu trúc thực tế của monorepo kết nối thương mại điện tử bằng <strong>npm workspaces</strong> và <strong>Changesets</strong>.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Khai báo Workspaces trong package.json</h3>
        <p>
          Tại file <code>package.json</code> ở gốc của dự án, chúng ta sử dụng trường <code>workspaces</code> để khai báo thư mục chứa các thư viện con:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`{
  "name": "shopee-tiktok-lazada-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "devDependencies": {
    "@changesets/cli": "^2.31.0"
  }
}`}
        </pre>
        <p>
          Cấu trúc cây thư mục của monorepo như sau:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`shopee-tiktok-lazada-monorepo/
├── package.json
├── packages/
│   ├── shopee-api-client/       # SDK tương tác Shopee
│   ├── tiktokshops-api-client/  # SDK tương tác TikTok Shop
│   ├── lazada-api-client/       # SDK tương tác Lazada
│   └── shopee-tiktokshops-lazada-api/ # Package hợp nhất (All-in-One)
└── scripts/
    └── sync-all-in-one-deps.cjs # Tự động hóa đồng bộ dependency`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Đồng bộ hóa Dependency bằng Script tự động</h3>
        <p>
          Gói hợp nhất (All-in-One) thực chất là một wrapper phụ thuộc trực tiếp vào 3 package con còn lại. Để tránh lỗi quên cập nhật phiên bản của các package con trong file dependencies của package all-in-one, ta viết một script Node.js <code>scripts/sync-all-in-one-deps.cjs</code> thực hiện quét phiên bản mới nhất ở local và cập nhật tự động:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// node scripts/sync-all-in-one-deps.cjs
// Script đọc version của shopee-api-client, tiktokshops-api-client, lazada-api-client
// rồi chèn chính xác phiên bản đó vào dependencies của gói all-in-one.`}
        </pre>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. Quản lý Phiên bản và Phát hành với Changesets</h3>
        <p>
          <strong>Changesets</strong> là giải pháp quản lý phiên bản mã nguồn cực kỳ mạnh mẽ cho monorepo. Nó giải quyết triệt để bài toán: Khi package A thay đổi, làm sao để tạo changelog và phát hành tự động?
        </p>
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-2xs font-sans text-xs space-y-3">
          <p className="font-bold text-zinc-800">Quy trình làm việc với Changesets:</p>
          <ul className="list-disc pl-4 space-y-1 text-zinc-600">
            <li><strong>npx changeset:</strong> Chạy khi hoàn thành một tính năng. CLI sẽ hỏi package nào đổi, thuộc loại version bump nào (patch, minor, major) và yêu cầu viết tóm tắt thay đổi.</li>
            <li><strong>npx changeset version:</strong> Chạy trước khi release. Lệnh này đọc tất cả changeset tạm thời, tự động tăng phiên bản trong các file <code>package.json</code> con và sinh ra file <code>CHANGELOG.md</code> mới.</li>
            <li><strong>npm publish --workspaces:</strong> Phát hành toàn bộ package đã được tăng phiên bản lên npm registry.</li>
          </ul>
        </div>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Tổng kết</h3>
        <p>
          Sử dụng <strong>npm workspaces</strong> kết hợp với <strong>Changesets</strong> giúp toàn bộ hệ thống SDK được tích hợp mượt mà, dễ dàng phát triển chéo và duy trì chuẩn hóa mã nguồn trên một kho Git duy nhất.
        </p>
      </div>
    )),
  },
];
