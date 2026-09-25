import type { BlogPost } from "../types";

/*
 * Mọi con số trong bài đo trên PostgreSQL 18.6 và 17.10 chạy bằng Docker
 * (image postgres:18 / postgres:17, cấu hình mặc định, 2 vCPU), ngày 25/09/2026.
 * Thời gian là trung vị của 5 lần chạy nóng; "pages" là số buffer 8 kB mà
 * EXPLAIN (ANALYZE, BUFFERS) báo — con số này ổn định hơn mili giây.
 */
const post: BlogPost = {
  slug: "postgresql-index-notes-measured",
  date: "2026-09-25",
  category: "PostgreSQL / Indexing",
  title: "I measured my old index notes on PostgreSQL 18. Five of them were wrong.",
  readTime: "10 min read",
  description:
    "Study notes on indexing, re-run with EXPLAIN (ANALYZE, BUFFERS) on PostgreSQL 18.6: there is no clustered index, and CLUSTER decayed from 17 to 283 pages after one round of writes; 'most selective column first' read 632 index pages where equality-first read 6; skip scan turned a 36 ms table scan into 1.9 ms, but not when the leading column has 200,000 values; LIKE 'abc%' ignores a normal index under en_US collation; and a boolean index pays off when the value is rare, best as a 456 kB partial index.",
  content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          A few years ago I kept a folder of study notes on database indexing: B-trees,
          composite indexes, when an index helps and when it does not. They read well. I
          reused them to prepare for interviews. Recently I went back and ran every claim in
          the PostgreSQL file against a real server, because a note that has never been run
          is only a guess with good formatting.
        </p>
        <p>
          Five of them did not survive. One was never true for PostgreSQL, one contradicted
          another note in the same file, one was true until PostgreSQL 18, one only holds
          under a collation most servers do not use, and one was right about the symptom and
          wrong about the fix.
        </p>
        <p>
          The setup: PostgreSQL 18.6, plus 17.10 where the version matters, both in Docker
          with default settings and the image&apos;s default database collation,{" "}
          <code>en_US.utf8</code>. An <code>orders</code> table with 2,000,000 rows (177 MB):
          200 shops, 200,000 customers, one year of <code>created_at</code>, inserted in
          random order. A <code>customers</code> table with 1,000,000 emails. Every query ran
          five times warm; I report the median time and the number of 8 kB pages the query
          touched, from <code>EXPLAIN (ANALYZE, BUFFERS)</code>. Trust the pages more than
          the milliseconds: pages do not depend on my laptop.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          0. First, a tell: the plan names
        </h3>
        <p>
          My notes described index access as <code>INDEX UNIQUE SCAN</code>,{" "}
          <code>INDEX RANGE SCAN</code> and <code>TABLE ACCESS FULL</code>. PostgreSQL never
          prints any of those. They are Oracle&apos;s plan operations. PostgreSQL&apos;s
          vocabulary is different, and it is the one you will be reading at 2 a.m.:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`Seq Scan              read the whole table, page by page
Index Scan            walk the index, fetch each matching row from the table
Index Only Scan       answer from the index alone (visibility map permitting)
Bitmap Index Scan     collect matching row locations from the index first,
  Bitmap Heap Scan    then visit the table pages in physical order`}
        </pre>
        <p>
          That alone was a warning. If a set of notes uses another database&apos;s
          vocabulary, some of its conclusions probably come from that database too. They did.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          1. &ldquo;A table can have one clustered index&rdquo;: PostgreSQL has none
        </h3>
        <p>
          The note said PostgreSQL has clustered and non-clustered indexes, chosen with a{" "}
          <code>CLUSTER</code> or <code>NONCLUSTER</code> keyword. That is SQL Server&apos;s
          model. PostgreSQL rejects both spellings:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE CLUSTERED INDEX x ON orders_c (customer_id);
-- ERROR:  syntax error at or near "CLUSTERED"
CREATE NONCLUSTERED INDEX x ON orders_c (customer_id);
-- ERROR:  syntax error at or near "NONCLUSTERED"`}
        </pre>
        <p>
          Every PostgreSQL table is a heap: rows go wherever there is room, and every index
          points into it. What PostgreSQL does have is a <em>command</em>,{" "}
          <code>CLUSTER table USING index</code>, which rewrites the table once in index
          order. The difference between a property and a one-off command is the whole story,
          so I measured it on a copy of <code>orders</code>, reading 100 customers&apos;
          orders by range:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Moment</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">correlation</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">rows</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">before CLUSTER</td><td className="p-3">0.002</td><td className="p-3">1,028</td><td className="p-3">1,003</td><td className="p-3">0.47 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">right after CLUSTER (took 2.5 s)</td><td className="p-3">1.000</td><td className="p-3">1,028</td><td className="p-3 text-emerald-700">17</td><td className="p-3">0.09 ms</td></tr>
              <tr><td className="p-3">after +10% inserts, 10% updates</td><td className="p-3">0.673</td><td className="p-3">1,135</td><td className="p-3">283</td><td className="p-3">0.13 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Right after <code>CLUSTER</code> the rows sit together and the query touches 17
          pages instead of 1,003. Then ordinary traffic arrives: new orders land at the end
          of the table, updated rows move to wherever there is space, and after a single
          round of writes the same query is back up to 283 pages. The planner&apos;s
          correlation statistic fell from 1.000 to 0.673. Meanwhile{" "}
          <code>pg_index.indisclustered</code> still says <code>true</code>: it only
          remembers which index to use the next time you run <code>CLUSTER</code> without
          naming one. The{" "}
          <a href="https://www.postgresql.org/docs/18/sql-cluster.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">documentation</a>{" "}
          says it plainly: clustering is a one-time operation, and later changes are not
          clustered.
        </p>
        <p>
          The cost is the part a note should never leave out. <code>CLUSTER</code> takes an{" "}
          <code>ACCESS EXCLUSIVE</code> lock, which blocks even plain reads. While it held
          the lock, a <code>SELECT</code> with a two-second lock timeout got nothing:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`SET lock_timeout = '2s';
SELECT count(*) FROM orders_c WHERE customer_id = 4242;
-- ERROR:  canceling statement due to lock timeout      (after 2.07 s)`}
        </pre>
        <p>
          So <code>CLUSTER</code> is a maintenance job for tables that are mostly read and
          rarely written, run in a window when nobody is reading them. It is not a design
          decision you make once in a migration and forget.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          2. &ldquo;Put the most selective column first&rdquo;: put the equality column first
        </h3>
        <p>
          One note advised leading a composite index with the column that has the most
          distinct values. Further down, the same file stated the opposite rule: equality
          columns first, range columns after. Both cannot be right, so I asked the question
          they disagree on. Orders from one shop in one month:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`SELECT * FROM orders
WHERE shop_id = 42
  AND created_at >= '2025-06-01' AND created_at < '2025-07-01';
-- 842 rows; the month alone holds 164,243 orders`}
        </pre>
        <p>
          <code>created_at</code> is almost unique; <code>shop_id</code> has 200 values. The
          &ldquo;most selective first&rdquo; rule says <code>(created_at, shop_id)</code>. I
          built each index alone and ran the query against it:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Index</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">index pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">total pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">PG 18</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">PG 17</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">(created_at, shop_id)</td><td className="p-3">632</td><td className="p-3">1,460</td><td className="p-3">1.59 ms</td><td className="p-3">1.85 ms</td></tr>
              <tr><td className="p-3">(shop_id, created_at)</td><td className="p-3 text-emerald-700">6</td><td className="p-3">834</td><td className="p-3 text-emerald-700">0.22 ms</td><td className="p-3">0.29 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          A hundred times more index pages for the &ldquo;selective&rdquo; order. The reason
          is how a B-tree range scan works. With <code>created_at</code> first, the scan
          starts at June 1st and has to walk every entry until July 1st, all 164,243 of
          them from every shop, checking <code>shop_id</code> as it goes. With{" "}
          <code>shop_id</code> first, it jumps to shop 42 and reads only that shop&apos;s
          June, which is contiguous in the index.
        </p>
        <p>
          What makes this easy to miss is that the plan hides it. Both plans print the same
          conditions:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`-- (created_at, shop_id)                      -- (shop_id, created_at)
Bitmap Index Scan  pages=632                  Bitmap Index Scan  pages=6
  Index Cond: created_at >= ... AND             Index Cond: shop_id = 42 AND
              created_at <  ... AND                         created_at >= ... AND
              shop_id = 42                                  created_at <  ...`}
        </pre>
        <p>
          <code>Index Cond</code> lists every condition checked inside the index, whether
          or not it narrowed the part of the index being read. Only <code>BUFFERS</code>{" "}
          shows the difference, which is why I no longer read a plan without it. The rule
          that holds: <strong>columns you compare with <code>=</code> first, the one range
          column last</strong>. Distinct-value counts only matter to break ties between
          equality columns.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          3. &ldquo;An index is useless without its first column&rdquo;: true until PostgreSQL 18
        </h3>
        <p>
          The classic rule: an index on <code>(shop_id, created_at)</code> cannot help a
          query that filters only on <code>created_at</code>, because the entries are sorted
          by shop first. On PostgreSQL 17 that is exactly what happens. On 18 it is not. One
          day of orders, 5,396 rows, same index on both servers:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Setup</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">plan</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">PG 17, (shop_id, created_at)</td><td className="p-3">Parallel Seq Scan</td><td className="p-3">22,704</td><td className="p-3">36.0 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">PG 17, index forced</td><td className="p-3">whole index read</td><td className="p-3">12,460</td><td className="p-3">22.7 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">PG 18, (shop_id, created_at)</td><td className="p-3">Bitmap Index Scan, 202 searches</td><td className="p-3">5,447</td><td className="p-3 text-emerald-700">1.92 ms</td></tr>
              <tr><td className="p-3">PG 18, plain index on (created_at)</td><td className="p-3">Bitmap Index Scan</td><td className="p-3">4,812</td><td className="p-3">1.70 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          PostgreSQL 18 added{" "}
          <a href="https://www.postgresql.org/docs/18/indexes-multicolumn.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">skip scan</a>{" "}
          for B-tree indexes. Instead of reading the whole index, it searches it once per
          distinct <code>shop_id</code>, and the plan reports it directly:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`Bitmap Index Scan on ix_skip  (actual rows=5396)
  Index Cond: (created_at >= '2025-06-01' AND created_at < '2025-06-02')
  Index Searches: 202
  Buffers: shared hit=652`}
        </pre>
        <p>
          202 searches for 200 shops, 652 index pages instead of 7,665, and within a
          quarter of a millisecond of a dedicated index. Now repeat it with a leading column
          that has many values, <code>(customer_id, created_at)</code> with about 200,000
          customers:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Setup</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">plan</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">PG 18, (customer_id, created_at)</td><td className="p-3">Parallel Seq Scan</td><td className="p-3">22,704</td><td className="p-3">44.8 ms</td></tr>
              <tr><td className="p-3">PG 18, same index forced</td><td className="p-3">whole index read, 1 search</td><td className="p-3">12,460</td><td className="p-3">25.1 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          No skip scan. Two hundred thousand searches would cost more than reading
          everything, and the planner knows it. So the updated rule is narrower than the old
          one: <strong>on PostgreSQL 18 a composite index can serve its second column when
          the first column has few distinct values</strong>. It rescues an index you already
          have. It does not replace one you need, and on 17 or earlier the old rule still
          applies in full.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          4. &ldquo;LIKE can use an index if % is not first&rdquo;: not your default index
        </h3>
        <p>
          The note said a pattern such as <code>&apos;abc%&apos;</code> can use an index, and{" "}
          <code>&apos;%abc&apos;</code> cannot. The second half is right. The first half depends
          on the collation, and the one most servers run with is not the one where it works.
          On the <code>en_US.utf8</code> database, with a plain B-tree index on{" "}
          <code>email</code>:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Query / index</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">plan</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">email = &apos;...&apos; / plain</td><td className="p-3">Index Scan</td><td className="p-3">4</td><td className="p-3">0.01 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">LIKE &apos;abc%&apos; / plain</td><td className="p-3">Parallel Seq Scan</td><td className="p-3">7,353</td><td className="p-3">19.1 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">LIKE &apos;abc%&apos; / text_pattern_ops</td><td className="p-3">Index Scan</td><td className="p-3">235</td><td className="p-3 text-emerald-700">0.07 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">LIKE &apos;abc%&apos; / COLLATE &quot;C&quot;</td><td className="p-3">Index Scan</td><td className="p-3">235</td><td className="p-3 text-emerald-700">0.08 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">LIKE &apos;%9f3a1%&apos; / text_pattern_ops</td><td className="p-3">Parallel Seq Scan</td><td className="p-3">7,353</td><td className="p-3">28.3 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">LIKE &apos;%9f3a1%&apos; / pg_trgm GIN</td><td className="p-3">Bitmap Index Scan</td><td className="p-3">19</td><td className="p-3 text-emerald-700">0.11 ms</td></tr>
              <tr><td className="p-3">LIKE &apos;abc%&apos; / pg_trgm GIN</td><td className="p-3">Bitmap Index Scan</td><td className="p-3">260</td><td className="p-3">0.34 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The plain index answers equality instantly and ignores the prefix search entirely.
          A linguistic collation does not sort strings byte by byte, so &ldquo;everything
          starting with abc&rdquo; is not guaranteed to be one contiguous range of that
          index. An index built with <code>text_pattern_ops</code>, or with{" "}
          <code>COLLATE &quot;C&quot;</code>, is sorted byte-wise, and the planner turns the
          prefix into a plain range: <code>email ~&gt;=~ &apos;abc&apos; AND email ~&lt;~ &apos;abd&apos;</code>.
          The{" "}
          <a href="https://www.postgresql.org/docs/18/indexes-opclass.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">operator class docs</a>{" "}
          say the same: the pattern classes exist for databases that do not use the C
          locale.
        </p>
        <p>
          That index has a price: it is sorted in the wrong order for everything else.{" "}
          <code>ORDER BY email LIMIT 10</code> could not use it and fell back to a scan and
          sort, 44 ms. If you need both prefix search and sorting by email, that is two
          indexes. For a pattern with a leading wildcard no B-tree helps. The note suggested
          full-text search, but full-text search matches words, not fragments of an address.
          The tool for <code>LIKE &apos;%fragment%&apos;</code> is <code>pg_trgm</code>: 0.11 ms,
          and the same GIN index also handles the prefix case. It costs 49 MB here against
          39 MB for the pattern index.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          5. &ldquo;Don&apos;t index a boolean&rdquo;: unless one value is rare, and then do it partially
        </h3>
        <p>
          The note&apos;s reasoning was that a column like <code>is_active</code> has only two
          values, so an index cannot narrow anything down. That is true when the values are
          balanced and false when they are not. <code>is_mobile</code> is true for half the
          orders; <code>is_refunded</code> for 1%. Both got an ordinary index, 13 MB each:
        </p>
        <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
          <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">Query</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">plan</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">pages</th>
                <th className="p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500">time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <tr className="border-b border-zinc-100"><td className="p-3">WHERE is_mobile (50%)</td><td className="p-3">Seq Scan, index ignored</td><td className="p-3">22,704</td><td className="p-3">73.8 ms</td></tr>
              <tr className="border-b border-zinc-100"><td className="p-3">WHERE is_refunded (1%), index disabled</td><td className="p-3">Seq Scan</td><td className="p-3">22,704</td><td className="p-3">39.6 ms</td></tr>
              <tr><td className="p-3">WHERE is_refunded (1%)</td><td className="p-3">Index Only Scan</td><td className="p-3">21</td><td className="p-3 text-emerald-700">1.07 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          For the balanced column the planner ignores the index, which still has to be
          updated on every write. For the rare value the same kind of index is 37 times
          faster. The note was right about the symptom and wrong about the rule: what
          matters is not how many values a column has but how rare the value you query is.
        </p>
        <p>
          And when you only ever query the rare value, you do not need to index the other
          99%. The real query was &ldquo;refunded orders in June&rdquo;:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`CREATE INDEX ON orders (is_refunded, created_at);         -- 60 MB,  0.32 ms
CREATE INDEX ON orders (created_at) WHERE is_refunded;   -- 456 kB, 0.44 ms`}
        </pre>
        <p>
          The{" "}
          <a href="https://www.postgresql.org/docs/18/indexes-partial.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">partial index</a>{" "}
          covers only the 20,001 refunded rows. It is 135 times smaller, costs nothing on
          writes to orders that were never refunded, and answers the query in about the
          same time. The planner uses it whenever the query&apos;s <code>WHERE</code> implies
          the index&apos;s condition.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">What the notes say now</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>PostgreSQL has no clustered index.</strong> <code>CLUSTER</code> sorts
            the table once, under a lock that blocks reads, and decays with the next writes.
          </li>
          <li>
            <strong>Equality columns first, the range column last.</strong> And read plans
            with <code>BUFFERS</code>: <code>Index Cond</code> shows what was checked, not
            what was skipped.
          </li>
          <li>
            <strong>On PostgreSQL 18, a composite index can serve its second column</strong>{" "}
            if the first has few distinct values. Look for <code>Index Searches</code> in the
            plan. On 17 and earlier, it cannot.
          </li>
          <li>
            <strong>Prefix <code>LIKE</code> needs <code>text_pattern_ops</code> or a{" "}
            <code>&quot;C&quot;</code> collation</strong> unless the database already uses C.
            Fragments need <code>pg_trgm</code>.
          </li>
          <li>
            <strong>Index a rare value, not a column.</strong> Usually as a partial index.
          </li>
          <li>
            <strong>Check which database a note was written for.</strong> Several of the
            wrong ones here were correct somewhere else.
          </li>
        </ul>
        <p>
          None of this took long to check: two Docker containers and a few dozen{" "}
          <code>EXPLAIN (ANALYZE, BUFFERS)</code> runs. The notes had been wrong for years.
          That trade is why I now measure a claim before I write it down, rather than after
          I have repeated it in an interview.
        </p>
      </div>
  ),
};

export default post;
