import type { BlogPost } from "../types";

const post: BlogPost = {
    slug: "optimistic-vs-pessimistic-locking",
    date: "2026-08-21",
    category: "PostgreSQL / Concurrency",
    title: "Overselling in a flash sale: which lock to reach for, and when you need none",
    readTime: "14 min read",
    description: "A flash sale with 100 shirts in stock took 200 orders — and the stock column still read 94. Measured on real PostgreSQL: the one-line fix nobody reaches for first, the lock that makes checkout 149× slower, the case where pessimistic locking cannot be used at all, and why a perfectly correct row lock still loses inventory once a queue is in the path.",
    content: () => (
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
};

export default post;
