import type { ReactNode } from "react";
import type { BlogPost } from "../types";

/*
 * Đo ngày 25/09/2026, đo lại toàn bộ ngày 26/09/2026 (lệch dưới 10%, trừ ping
 * dưới 1 ms và những chỗ bài ghi rõ). Apple M4 (10 nhân: 4 performance,
 * 6 efficiency), Node.js 22.21.1; phần container dùng node:20-slim (20.20.2,
 * libuv 1.46.0), node:22-slim (22.23.3, libuv 1.51.0) và node:24-slim (24.21.0,
 * libuv 1.52.1) trong Docker Desktop, VM 2 CPU.
 * Benchmark: trung vị của 3–5 lần chạy; CPU time lấy từ process.cpuUsage(),
 * cộng dồn mọi thread của process. Bảng mục 1 là code gốc chạy nguyên văn
 * (CPU = user + sys từ /usr/bin/time); bảng 64 request ở mục 5 đo ngày 26/09.
 * Code gốc: tipjs-main/backend/woker-thread.
 */

const th = "p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500";
const pre = "bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed";
const link = "underline underline-offset-2";

/** Bảng số liệu cùng kiểu với các bài đo khác; ô bọc trong <Good> được tô xanh. */
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="border border-zinc-300 rounded-lg overflow-hidden my-2">
      <table className="w-full my-6 border border-zinc-200 rounded-lg overflow-hidden text-left">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            {head.map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-[12px]">
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? "border-b border-zinc-100" : undefined}>
              {row.map((cell, j) => (
                <td key={j} className="p-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Good = ({ children }: { children: ReactNode }) => <span className="text-emerald-700">{children}</span>;

const post: BlogPost = {
  slug: "nodejs-worker-threads-measured",
  date: "2026-09-25",
  category: "Node.js / Concurrency",
  title: "My worker_threads benchmark said 4× faster. On a server, that was the least important number.",
  readTime: "9 min read",
  description:
    "Re-running an old Node.js worker_threads benchmark on 10 cores: one of six workers got no jobs, a slice-for-splice bug in the earlier version ran 2 jobs as 5 and made four workers slower than none (991 ms vs 915 ms), the speedup topped out near 5.8× while os.cpus() ignored a container's CPU limit, and the number that matters on a server was /ping: 1.8 s with the work on the main thread, 0.5 ms with a worker pool.",
  content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          My old study notes have a folder with three small files on Node.js worker threads.{" "}
          <code>main.js</code> counts to a billion five times on the main thread.{" "}
          <code>index.js</code> hands the same five jobs to six worker threads, and{" "}
          <code>worker.js</code> does the counting. I ran it once, saw the second number come
          out much smaller than the first, and took away the obvious lesson: worker threads make
          CPU-heavy work faster.
        </p>
        <p>
          I ran it again this week and printed more than the final time. The speedup is real.
          But the split in the current version gives one worker nothing, the version I had
          commented out above it has a one-letter bug that made workers slower than no workers,
          the worker count is a guess, and the benefit that matters most on a server does not
          show up in this benchmark at all.
        </p>
        <p>
          The setup: Node.js 22.21 on an Apple M4 laptop with 10 cores (4 performance, 6
          efficiency), plus Node.js 20.20, 22.23 and 24.21 in Docker for the container part.
          Times are medians of three to five runs. Next to wall-clock time I report CPU time from{" "}
          <code>process.cpuUsage()</code>, which adds up every thread in the process. That is
          the number that shows wasted work. I repeated every measurement the next day in a
          fresh session; the results agreed within 10%, apart from sub-millisecond ping times
          and where the text says otherwise.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          1. The benchmark as written: 4×, and one worker with nothing to do
        </h3>
        <p>
          The notes, run unchanged. Wall time is what the scripts print; CPU time is for the
          whole process, from <code>time</code>:
        </p>
        <Table
          head={["Run", "wall time", "CPU time"]}
          rows={[
            ["main.js: 5 jobs on the main thread", "2,334 ms", "2.31 s"],
            ["index.js: 5 jobs, 6 workers", <Good key="t">575 ms</Good>, "2.85 s"],
          ]}
        />
        <p>Four times faster. Then I printed what each worker had received:</p>
        <pre className={pre}>
{`const jobsPerWorker = jobs.length / numWorkers;   // 5 / 6 = 0.8333…

// worker 0: jobs.slice(0,      0.8333)  ->  slice(0, 0)  ->  []
// worker 1: jobs.slice(0.8333, 1.6667)  ->  slice(0, 1)  ->  [1e9]
// ...
// jobs per worker: [0, 1, 1, 1, 1, 1]`}
        </pre>
        <p>
          <code>slice()</code> truncates fractional indexes, so the first worker got an empty
          array, started up, and returned 0. The total was still right, 5,000,000,000, because
          the truncated ranges still cover all five jobs, so nothing looked wrong. The six
          workers were really five.
        </p>
        <p>
          Timing each worker separately showed something else. Each job took 530–565 ms inside
          a worker, against about 465 ms on the main thread running alone. The same job runs
          slower when four other cores are busy at the same time, and the process spent 2.85 s
          of CPU on work that took 2.31 s on one thread. Five jobs on five cores gave 4×, not 5×.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          2. The version I had commented out: one letter, 2.5 times the work
        </h3>
        <p>
          Above that code, commented out, was an earlier attempt that split the jobs with a
          helper:
        </p>
        <pre className={pre}>
{`function chunkify(array, n) {
  let chunks = [];
  for (let i = n; i > 0; i--) {
    chunks.push(array.slice(0, Math.ceil(array.length / i)));
  }
  return chunks;
}`}
        </pre>
        <p>
          It is meant to cut the array into <code>n</code> pieces. It never cuts anything.{" "}
          <code>slice</code> copies part of the array and leaves the array unchanged, so every
          pass starts again from index 0 of the full list, and the last chunk is always the
          whole array. It only does its job with <code>splice</code>, which removes the items it
          returns:
        </p>
        <pre className={pre}>
{`                     slice (as written)       splice
2 jobs, 4 workers    [1, 1, 1, 2]  = 5 jobs    [1, 1, 0, 0] = 2 jobs
8 jobs, 4 workers    [2, 3, 4, 8]  = 17 jobs   [2, 2, 2, 2] = 8 jobs`}
        </pre>
        <p>The notes used two jobs of a billion:</p>
        <Table
          head={["Run", "wall time", "CPU time"]}
          rows={[
            ["2 jobs on the main thread", "915 ms", "914 ms"],
            ["4 workers, chunkify with slice", "991 ms", "2,579 ms"],
            ["4 workers, chunkify with splice", <Good key="t">486 ms</Good>, "1,001 ms"],
          ]}
        />
        <p>
          With the bug, four workers were slower than none. One of them counted both jobs by
          itself while the other three repeated work nobody had asked for. Had I stopped at that
          version, the note would have said worker threads are not worth it.
        </p>
        <p>
          The benchmark could not catch it because it never printed its result. Each worker
          reported &ldquo;completed&rdquo; and the main thread printed a time. The later version
          adds up the counts; with this bug it would have printed 5,000,000,000 for two jobs of
          a billion, and the mistake would have been obvious in a second. Wall time hid it as
          well: 991 ms against 915 ms looks like worker overhead. CPU time, 2.8 times the main
          thread&apos;s, does not.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          3. &ldquo;The number of workers you want&rdquo;: the cores decide, and os.cpus() does not know your limit
        </h3>
        <p>
          The notes set <code>numWorkers = 6</code>{" "}with the comment &ldquo;the number of workers
          you want to use&rdquo;. So I varied it: the same 4.8 billion increments, split evenly as
          480 jobs of ten million:
        </p>
        <Table
          head={["Workers", "wall time", "speedup", "CPU time"]}
          rows={[
            ["main thread", "2,266 ms", "1.0×", "–"],
            ["1", "2,241 ms", "1.0×", "2,244 ms"],
            ["2", "1,155 ms", "2.0×", "2,314 ms"],
            ["4", "640 ms", "3.5×", "2,556 ms"],
            ["6", "506 ms", "4.5×", "2,914 ms"],
            ["8", "415 ms", "5.5×", "3,211 ms"],
            ["10", "394 ms", "5.8×", "3,420 ms"],
            ["12", "390 ms", "5.8×", "3,466 ms"],
            ["16", "398 ms", "5.7×", "3,563 ms"],
            ["32", "447 ms", "5.1×", "4,019 ms"],
          ]}
        />
        <p>
          Close to linear up to two workers, and 3.5× at four, the number of performance cores.
          Each of the six efficiency cores adds less, and from eight workers on the differences
          are noise: over three sessions, 8, 10, 12 and 16 workers all finished in 390–455 ms,
          and the fastest of them changed between sessions. The middle rows are also the least
          stable; with a browser busy in the background, one session ran six workers in 615 ms
          instead of 506. Past the core count, more workers only cost more: 32 were slower than
          10 and burned 1.8 times the CPU of one. On ten cores the speedup topped out near 5.8×.
          The ceiling is the number of cores, and not every core is equal.
        </p>
        <p>
          In production the count often comes from <code>os.cpus().length</code>. In a
          container that number describes the machine, not your share of it. The Docker VM here
          has 2 CPUs:
        </p>
        <pre className={pre}>
{`                   os.cpus()         os.availableParallelism()
docker run         (any Node)     Node 20.20   Node 22.23   Node 24.21
--cpus=1               2               2            1            1
--cpus=1.5             2               2            1            1
--cpus=0.9             2               2            2            1
--cpus=0.5             2               2            2            1
--cpuset-cpus=0        2               1            1            1`}
        </pre>
        <p>
          <a href="https://nodejs.org/docs/latest-v22.x/api/os.html#osavailableparallelism" target="_blank" rel="noopener noreferrer" className={link}>os.availableParallelism()</a>{" "}
          also reads the CPU quota from the cgroup on Node.js 22 and 24, which is why they get{" "}
          <code>--cpus=1</code> right. Node.js 20 ships an older libuv that ignores the quota and
          only respects <code>--cpuset-cpus</code>. Node.js 22.23, the latest 22.x, ships libuv
          1.51, which computes the quota as{" "}
          <a href="https://github.com/libuv/libuv/blob/v1.51.0/src/unix/linux.c#L2372" target="_blank" rel="noopener noreferrer" className={link}>limit / period in integer arithmetic</a>:
          1.5 CPUs becomes 1, and anything below one CPU becomes 0, which the{" "}
          <a href="https://github.com/libuv/libuv/blob/v1.51.0/src/unix/core.c#L2052" target="_blank" rel="noopener noreferrer" className={link}>next check</a>{" "}
          treats as &ldquo;no limit&rdquo;, falling back to the machine&apos;s count. libuv 1.52{" "}
          <a href="https://github.com/libuv/libuv/blob/v1.52.0/src/unix/linux.c#L2348" target="_blank" rel="noopener noreferrer" className={link}>turns that 0 into a 1</a>,
          and Node.js ships it from 24.16. A Kubernetes CPU limit of <code>500m</code> sets the
          same kind of quota, so on Node.js 22 I would expect the same fallback there; I have not
          tested it.
        </p>
        <p>
          What oversubscribing costs under a one-CPU limit: one worker 474 ms, two workers (the
          count <code>os.cpus()</code> suggests) 518 ms, four workers 592 ms. Size a pool from{" "}
          <code>os.availableParallelism()</code>, print it once inside the container you deploy,
          and set the size yourself on Node.js 20, or on 22 when the limit is below one CPU.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          4. What a worker buys on a server: an event loop that keeps answering
        </h3>
        <p>
          Everything so far measures how fast a batch finishes when the process has nothing else
          to do. A server always has something else to do. So I put the same billion-count
          behind an HTTP endpoint, <code>/report</code> (about 460 ms of CPU), next to a{" "}
          <code>/ping</code>{" "}that returns &ldquo;ok&rdquo;, sent eight reports at once, and
          pinged every 50 ms until they finished:
        </p>
        <Table
          head={["Where /report runs", "all 8 done", "/ping median", "/ping max"]}
          rows={[
            ["main thread", "3,661 ms", "1,774 ms", "3,559 ms"],
            ["pool of 4 workers", "1,053 ms", <Good key="m">0.5 ms</Good>, <Good key="x">0.8 ms</Good>],
            ["pool of 8 workers", <Good key="a">664 ms</Good>, "0.8 ms", "5.2 ms"],
          ]}
        />
        <p>
          With the work on the main thread, the server was not only slow at reports. It was slow
          at everything: a request that does nothing waited 1.8 s at the median and 3.6 s at
          worst. Health checks with a two-second timeout would have started failing while the
          server was busy doing its job. Pinging every 10 ms instead of 50 was worse: 188 of 333
          pings failed outright with <code>ECONNRESET</code> or <code>EPIPE</code>. macOS lets at
          most 128 connections wait to be accepted (<code>kern.ipc.somaxconn</code>), and while
          the event loop was busy nothing accepted them. With a pool of eight, none failed.
        </p>
        <p>
          With a pool, the median <code>/ping</code> stayed under a millisecond and the reports
          finished sooner as well. This is the real reason to use worker threads in a web
          server, and a batch benchmark cannot show it. Each report still needs its 460 ms of
          CPU; what changes is that every other request stops waiting for it. The{" "}
          <a href="https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop" target="_blank" rel="noopener noreferrer" className={link}>Node.js guide on the event loop</a>{" "}
          makes the same argument; this is what it looks like in numbers.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          5. What a worker costs: start-up, memory, and copying
        </h3>
        <p>
          A worker is not a lightweight thread. Each one is an operating-system thread running
          its own V8 isolate, with its own heap and event loop. On this machine:
        </p>
        <pre className={pre}>
{`new Worker() until its first message     ~11 ms    (median of 20)
memory per idle worker (RSS)             ~7.8 MB
small message, round trip                ~0.01 ms`}
        </pre>
        <p>
          That makes &ldquo;start a worker per request&rdquo; easy to write and expensive under
          load. Sixty-four reports at once:
        </p>
        <Table
          head={["Setup", "all 64 done", "first report", "median report", "peak RSS"]}
          rows={[
            ["pool of 10 workers + queue", "4,757 ms", <Good key="f">692 ms</Good>, <Good key="m">2,775 ms</Good>, <Good key="r">146 MB</Good>],
            ["new Worker per request", "4,696 ms", "3,216 ms", "4,614 ms", "616 MB"],
          ]}
        />
        <p>
          Both kept all ten cores busy, so the batch took the same time. But 64 threads sharing
          10 cores all finish near the end: the first report came back after 3.2 s instead of
          0.7 s, the median after 4.6 s instead of 2.8 s, and memory went up 4.2 times. With a
          queue, the first reports are back in 0.7 s and the rest wait their turn. The pool size
          matters too: a pool of eight left two cores idle and needed 5.1–5.4 s for the same
          batch. Libraries such as Piscina give you the pool and the queue; what matters is having
          one, sized to the cores and created once at start-up.
        </p>
        <p>
          The other cost is data.{" "}
          <a href="https://nodejs.org/docs/latest-v22.x/api/worker_threads.html" target="_blank" rel="noopener noreferrer" className={link}>Workers do not share objects</a>{" "}
          with the main thread: <code>postMessage</code> copies them with the structured clone
          algorithm. For data made of many small objects, the copy is the expensive part:
        </p>
        <pre className={pre}>
{`1,000,000 objects { id, sku, price }
  postMessage to a worker and back               ~350 ms
  main thread blocked inside postMessage         ~115 ms   (serialising)
  summing price on the main thread instead         ~8 ms

32 MB Float64Array
  copied                                         4–17 ms
  transferred (ownership moves to the worker)    ~0.1 ms
  SharedArrayBuffer                              ≤0.1 ms`}
        </pre>
        <p>
          Handing the million objects to a worker blocked the main thread for 115 ms, more than
          ten times as long as summing their prices in place. Send the worker an id or a query
          and let it load its own data, or pass numbers in typed arrays and transfer them.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          6. Sometimes Node already has the threads
        </h3>
        <p>
          The last thing the notes missed: Node already runs some expensive work off the main
          thread. The asynchronous versions of <code>crypto.pbkdf2</code>,{" "}
          <code>crypto.scrypt</code>, <code>zlib</code> and the <code>fs</code>{" "}calls run on
          libuv&apos;s thread pool. Password hashing at login is the common case.
          PBKDF2-HMAC-SHA512 at{" "}
          <a href="https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" target="_blank" rel="noopener noreferrer" className={link}>OWASP&apos;s 220,000 iterations</a>{" "}
          takes 38 ms here. Forty logins at once:
        </p>
        <Table
          head={["Setup", "all 40 done", "median login", "/ping max"]}
          rows={[
            ["pbkdf2Sync", "1,536 ms", "812 ms", "224 ms"],
            ["pbkdf2, default pool of 4", "461 ms", "259 ms", <Good key="p">2.7 ms</Good>],
            ["pbkdf2, UV_THREADPOOL_SIZE=8", <Good key="a">322 ms</Good>, <Good key="m">194 ms</Good>, "2.5 ms"],
          ]}
        />
        <p>
          Dropping the <code>Sync</code> did what a worker pool would do, with no worker code.
          The catch is the size: four threads by default, shared with file system calls,{" "}
          <code>dns.lookup</code> and compression, so a burst of logins can hold up file reads
          and DNS lookups, and the other way round. <code>UV_THREADPOOL_SIZE</code> raises the
          limit; set it in the environment when the process starts.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">What the notes say now</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>A benchmark prints its answer, not just its time.</strong> And CPU time next
            to wall time. The slice bug did 2.5 times the work and looked like overhead.
          </li>
          <li>
            <strong>Check how the work was split before timing it.</strong>{" "}
            <code>[0, 1, 1, 1, 1, 1]</code> and <code>[1, 1, 1, 2]</code> both ran without an
            error.
          </li>
          <li>
            <strong>Size the pool from <code>os.availableParallelism()</code>,</strong> checked
            inside the container, never from <code>os.cpus().length</code>. On Node.js 22 a
            limit below one CPU still falls back to the machine&apos;s count; Node.js 20 ignores
            the limit entirely.
          </li>
          <li>
            <strong>On a server, the win is the event loop, not the speedup.</strong>{" "}
            <code>/ping</code> went from 1.8 s to 0.5 ms.
          </li>
          <li>
            <strong>One pool with a queue, created at start-up.</strong> Not a worker per request.
          </li>
          <li>
            <strong>Send ids or transferable buffers, not object graphs.</strong> Copying can
            cost more than the work.
          </li>
          <li>
            <strong>Before writing a worker, look for the async API.</strong> <code>pbkdf2</code>{" "}
            already runs off the main thread.
          </li>
        </ul>
        <p>
          The 4× in my notes was correct, and it was the least useful thing that benchmark could
          tell me. The question for a server is not how fast one batch finishes on an idle
          machine. It is what everything else waits for while the batch runs.
        </p>
      </div>
  ),
};

export default post;
