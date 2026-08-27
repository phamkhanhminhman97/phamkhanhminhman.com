import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "postgresql-isolation-levels-measured",
  date: "2026-08-27",
  category: "PostgreSQL / Concurrency",
  title: "PostgreSQL has four isolation levels. You only get three.",
  readTime: "11 min read",
  description: "The isolation table everyone copies belongs to the SQL standard, not to PostgreSQL. Measured on PostgreSQL 16: READ UNCOMMITTED is accepted and quietly ignored, Repeatable Read blocks phantoms the standard says it should allow, a plain SELECT at Repeatable Read blocks a writer for 1ms against 4003ms for a real lock, and the one anomaly that separates Repeatable Read from Serializable costs you a 40001 you have to retry.",
  content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Search for transaction isolation and you get the same table every time: four
          levels down the side, three anomalies across the top, X marks where each one is
          allowed. Read uncommitted permits dirty reads. Repeatable read still permits
          phantoms. Serializable permits nothing.
        </p>
        <p>
          That table is accurate. It describes the SQL standard. It does not describe
          PostgreSQL, and if you write code against it you will be wrong in both directions
          — defending against anomalies that cannot happen, and exposed to one that the
          table does not list at all.
        </p>
        <p>
          Everything below is measured on PostgreSQL 16.15 with two real connections
          overlapping. The numbers are from those runs.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          1. The fourth level is accepted and ignored
        </h3>
        <p>
          PostgreSQL takes <code>READ UNCOMMITTED</code> without complaint, and asking it
          back confirms the setting:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SHOW transaction_isolation;
-- read uncommitted`}
        </pre>
        <p>
          So the level exists as far as the interface is concerned. Now hold an uncommitted
          change in one session and try to read it from another:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`-- Session A                             -- Session B (READ UNCOMMITTED)
BEGIN;
UPDATE acct SET bal=999 WHERE id=1;
-- held, not committed
                                         SELECT bal FROM acct WHERE id=1;
                                         -- 100      <- not 999
ROLLBACK;`}
        </pre>
        <p>
          Session B reads <code>100</code>. I checked the premise rather than trusting the
          setup: <code>pg_stat_activity</code> showed one backend holding a live{" "}
          <code>backend_xid</code>, so the uncommitted <code>999</code> genuinely existed at
          that moment. It was simply never visible.
        </p>
        <p>
          Dirty reads are not implementable here. Under MVCC an uncommitted row version is
          stamped with a transaction id that no other snapshot considers valid, so there is
          no code path that returns it. PostgreSQL accepts the keyword for standard
          compliance and silently gives you Read Committed instead. Four levels in the
          syntax, three in behaviour.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          2. Read Committed: the default, and what it does not promise
        </h3>
        <p>
          Read Committed is the default, and the promise is narrow: you never see
          uncommitted data. It says nothing about seeing the <em>same</em> data twice, and
          that is not a corner case — it takes two ordinary statements:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`-- Session A (READ COMMITTED)            -- Session B
BEGIN;
SELECT bal FROM acct WHERE id=1;
-- 100
                                         UPDATE acct SET bal=555 WHERE id=1;
                                         COMMIT;
SELECT bal FROM acct WHERE id=1;
-- 555        <- same transaction, different answer
COMMIT;`}
        </pre>
        <p>
          Each statement takes a fresh snapshot, so a long transaction is not reading one
          version of the world — it is reading a slideshow. Count rows and the same thing
          happens with rows appearing rather than changing:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`READ COMMITTED   count #1 = 2   count #2 = 3    <- phantom read
                 (a concurrent INSERT committed in between)`}
        </pre>
        <p>
          Neither of these throws. If a report sums a column, then re-reads it to check a
          total, Read Committed lets those two reads disagree and nothing anywhere says so.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          3. Repeatable Read blocks phantoms — which the standard says it need not
        </h3>
        <p>
          Raise the level and re-run both scenarios unchanged:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`non-repeatable read
  READ COMMITTED    read #1 = 100   read #2 = 555     changed
  REPEATABLE READ   read #1 = 100   read #2 = 100     stable

phantom read
  READ COMMITTED    count #1 = 2    count #2 = 3      phantom
  REPEATABLE READ   count #1 = 2    count #2 = 2      blocked
                    (outside the transaction: 3 rows, the INSERT did commit)`}
        </pre>
        <p>
          The second block is the interesting one. The standard&apos;s table permits phantom
          reads at Repeatable Read; PostgreSQL blocks them anyway. That is not a bonus
          feature bolted on, it falls out of the implementation: Repeatable Read takes one
          snapshot at the first statement and every later read in that transaction is
          answered from it. A row inserted afterwards is not <em>hidden</em> by a lock — it
          simply is not in the snapshot.
        </p>
        <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
          This is where copying the standard&apos;s table costs you real work. Code written
          to defend against phantoms at Repeatable Read on PostgreSQL is defending against
          something that cannot occur. Meanwhile the anomaly that <em>can</em> occur, in
          §6, is not in that table at all.
        </blockquote>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          4. &ldquo;Repeatable Read means read locks&rdquo; is off by three orders of magnitude
        </h3>
        <p>
          The usual explanation for why the reads above stayed stable is that Repeatable
          Read holds read locks until commit, so nobody can modify what you have read. That
          is a testable claim, so I tested it — with a control, because a single timing
          number proves nothing on its own. Same scenario twice: one session holds a row
          while another tries to update it.
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CONTROL   holder ran SELECT ... FOR UPDATE   ->  writer waited 4003 ms
TEST      holder ran a plain SELECT at RR    ->  writer waited    1 ms`}
        </pre>
        <p>
          The control is there to prove the measurement can detect a lock at all: a real
          <code> FOR UPDATE</code> made the writer wait out the holder&apos;s full four
          seconds. Against a plain <code>SELECT</code> at Repeatable Read the same writer
          finished in a millisecond. There is no read lock. There was never a read lock.
        </p>
        <p>
          Both facts have the same cause. An <code>UPDATE</code> does not overwrite a row,
          it writes a new version alongside the old one, so a writer has nothing to wait
          for and a reader holding an older snapshot keeps seeing the older version. Readers
          do not block writers, writers do not block readers, and the level you choose
          decides <em>when your snapshot is taken</em> rather than <em>how long you hold
          locks</em>.
        </p>
        <p>
          Locks have not disappeared — two transactions updating the same row still
          serialise, and <code>SELECT ... FOR UPDATE</code> is exactly how you ask for a
          lock deliberately. It is ordinary reads that are free.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          5. A stable snapshot does not make read-modify-write safe
        </h3>
        <p>
          Here is the trap that follows from §3. Repeatable Read gives such clean reads that
          it looks like it makes the classic read-then-write pattern safe. It does not. Two
          transactions, both reading a balance of 100, one adding 10 and one adding 20. The
          correct answer is 130:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`READ COMMITTED    final bal = 120   no error
REPEATABLE READ   final bal = 110   ERROR 40001: could not serialize access
                                           due to concurrent update
SERIALIZABLE      final bal = 110   ERROR 40001: (same)`}
        </pre>
        <p>
          Read Committed returned <code>120</code> and reported success. One update was
          overwritten by the other and the total is quietly wrong forever. That is a lost
          update, and it is the most expensive line in this post.
        </p>
        <p>
          Repeatable Read returned <code>110</code>, which looks worse and is not.{" "}
          <code>110</code> is one transaction committed correctly and the other refused with
          SQLSTATE <code>40001</code>. Nothing was silently lost; one caller was told to
          come back. Retry it and you land on 130.
        </p>
        <p>
          So Repeatable Read does not remove the conflict, it converts a silent wrong answer
          into a loud error — and hands you the obligation to catch it. Any code running
          above Read Committed needs this, and it belongs around the whole transaction,
          because a retry means redoing the reads too:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`for attempt in range(3):
    try:
        with conn.transaction():          # BEGIN ... COMMIT
            bal = read_balance(conn, 1)   # the read must happen inside the retry
            write_balance(conn, 1, bal + delta)
        break
    except psycopg.errors.SerializationFailure:
        if attempt == 2:
            raise
        time.sleep(0.05 * 2 ** attempt)   # back off, then take a fresh snapshot`}
        </pre>
        <p>
          Retrying only the <code>UPDATE</code> re-applies arithmetic derived from a stale
          read, which reintroduces the bug you raised the isolation level to remove.
        </p>
        <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
          Worth saying plainly: if the whole operation fits in one statement —{" "}
          <code>UPDATE acct SET bal = bal + 20 WHERE id = 1</code> — none of this applies.
          The database does the read and the write atomically, at any isolation level, with
          no retry loop. Raising the isolation level is what you do when the logic genuinely
          cannot fit in one statement.
        </blockquote>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          6. Write skew: the one reason to reach for Serializable
        </h3>
        <p>
          By now Repeatable Read looks close to complete: stable reads, no phantoms, lost
          updates turned into retryable errors. So what is Serializable for?
        </p>
        <p>
          For this. An on-call table with a rule everybody knows — at least one person must
          stay on call. Two people, both on call, both deciding to go home at the same
          moment. Each checks the rule first, and each check passes:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`-- both sessions run exactly this, concurrently
BEGIN;
SELECT count(*) FROM duty WHERE on_call;      -- 2, so it is safe for me to leave
UPDATE duty SET on_call = false WHERE name = :me;
COMMIT;`}
        </pre>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`REPEATABLE READ   0 people left on call    no error
SERIALIZABLE      1 person  left on call    ERROR 40001: could not serialize access
                                                  due to read/write dependencies
                                                  among transactions`}
        </pre>
        <p>
          Repeatable Read committed both transactions happily and left nobody on call. No
          lost update happened — the two transactions touched <em>different rows</em>, so
          there was no conflict to detect. Each one read a fact, that fact was invalidated by
          the other, and both wrote based on what was true when they looked.
        </p>
        <p>
          That is write skew, and it is not in the standard&apos;s three-anomaly table.
          Snapshot isolation is exactly where it lives, so it is precisely the anomaly
          PostgreSQL users are least warned about.
        </p>
        <p>
          Serializable catches it. PostgreSQL implements Serializable as SSI — Serializable
          Snapshot Isolation — which tracks the read/write dependencies between overlapping
          transactions and aborts one when the pattern could not have arisen from running
          them one after another. Note what it does not do: it does not queue transactions
          behind locks. They run concurrently and one loses at commit time. That is why the
          message says <em>read/write dependencies</em> rather than anything about waiting.
        </p>
        <p>
          The cost is that same <code>40001</code>, and now it can hit transactions that
          never touched a common row — so the retry loop from §5 stops being optional
          bookkeeping and becomes the price of admission.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">7. Choosing, in order</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Can it be one statement?</strong> Then do that and stop reading. An
            atomic <code>UPDATE ... SET x = x + n</code> beats every level below, with no
            retries.
          </li>
          <li>
            <strong>Read Committed</strong> — the default — for anything where two reads
            disagreeing is survivable. Just do not run read-modify-write on it: that is the{" "}
            <code>120</code> that never reports an error.
          </li>
          <li>
            <strong>Repeatable Read</strong> when a transaction must see one consistent
            version of the world: reports, exports, multi-step reads. On PostgreSQL you get
            phantom protection for free. Bring the retry loop.
          </li>
          <li>
            <strong>Serializable</strong> when correctness depends on an invariant spanning
            rows that your transaction does not itself write — the on-call rule, double
            booking, any &ldquo;at least one&rdquo; or &ldquo;at most N&rdquo; constraint.
            Nothing below it sees write skew.
          </li>
          <li>
            <strong>Handle 40001 anywhere above Read Committed.</strong> An unhandled
            serialization failure is a 500 to a user who did nothing wrong, in an app that
            was one retry away from being correct.
          </li>
        </ul>
        <p>
          The thread through all of it: isolation levels on PostgreSQL are not about how
          long locks are held, they are about when your snapshot is taken and which
          conflicts get promoted from silent corruption into an error you have to answer for.
          Each level up trades a class of quiet wrongness for a retry you have to write.
          That is the actual decision, and the standard&apos;s table does not show it.
        </p>
      </div>
  ),
};

export default post;
