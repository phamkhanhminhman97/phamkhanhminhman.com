import type { ReactNode } from "react";
import Link from "next/link";
import type { BlogPost } from "../types";

/*
 * Đo ngày 26/09/2026 trên Apple M4: Node.js 22.21.1, PostgreSQL 18.6 (Docker),
 * trình duyệt Chromium 153 (in-app browser của Codex) cho phần hai tab.
 * Server thử nghiệm: RT 32 byte ngẫu nhiên, lưu SHA-256 trong Postgres kèm parent_id
 * và family_id; AT là JWT HS256 sống 15 phút (5 giây ở phần cần AT hết hạn).
 * Số lần chạy ghi trong từng bảng. Ghi chú gốc: tipjs-main/jwt/JWT.md.
 */

const th = "p-3 font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-500";
const pre = "bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed";
const link = "underline underline-offset-2";

/** Bảng số liệu cùng kiểu với các bài đo khác; ô bọc trong <Good> được tô xanh.
 *  Khung cuộn ngang được vì bảng 5 cột rộng hơn màn hình điện thoại. */
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="border border-zinc-300 rounded-lg overflow-x-auto my-2">
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
  slug: "refresh-token-rotation-measured",
  date: "2026-09-26",
  category: "Auth / Concurrency",
  title: "Refresh token rotation caught the thief. It also caught my second tab.",
  readTime: "9 min read",
  description:
    "A three-line note on refresh token rotation with reuse detection, built and measured: it catches a stolen token, but two tabs refreshing at once logged the real user out 30 times out of 30, a page firing parallel requests 200 out of 200, and a lost response 50 out of 50. A naive check-then-write server hid the parallel case by minting two tokens 199 times out of 200. A grace window removes the logouts, but only one of the two ways to build it still catches a thief.",
  content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          My notes on JWT have one entry about refresh tokens. Translated, this is all of it:
        </p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Every time a new access token is issued, issue a new refresh token too, and keep the old one.</li>
          <li>
            Once an old refresh token is used again, no need to tell the user from the hacker:
            revoke every active refresh token.
          </li>
          <li>The user logs in again and gets a new one.</li>
        </ol>
        <p>
          This is refresh token rotation with reuse detection, and it is not folklore.{" "}
          <a href="https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2" target="_blank" rel="noopener noreferrer" className={link}>RFC 9700</a>,
          the current OAuth security best practice, requires either this or sender-constrained
          tokens for public clients such as single-page apps, and describes the same trade: when
          an invalidated refresh token comes back, the server &ldquo;cannot determine which party
          submitted&rdquo; it, so it revokes the active one and makes the legitimate client log in
          again.
        </p>
        <p>
          The note stops where the RFC stops. It says what to do when an old token comes back. It
          does not ask how often one comes back when nobody has stolen anything. So I built the
          three lines and counted.
        </p>
        <p>
          The server runs on Node.js 22 with PostgreSQL 18.6 in Docker. Refresh tokens are 32
          random bytes, stored as SHA-256 hashes with a pointer to the token they replaced. Access
          tokens are HS256 JWTs that live 15 minutes, or 5 seconds in the tests that needed one to
          expire. The browser tests keep the refresh token in an HttpOnly cookie and ran in
          Chromium 153. Each table says how many times its scenario ran.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          1. The case it was built for: it works, with two gaps
        </h3>
        <p>
          First the thief. Someone copies the refresh token RT0 and uses it before the real user
          does:
        </p>
        <pre className={pre}>
{`attacker  POST /auth/refresh   RT0   200  gets RT1 and an access token
user      POST /auth/refresh   RT0   401  reuse: every refresh token revoked
attacker  POST /auth/refresh   RT1   401  revoked
attacker  GET  /api/me         AT    200  ...and 200 for another 4.9 seconds`}
        </pre>
        <p>
          In the other order, user first, the attacker&apos;s RT0 is the reused one and gets a
          401 at once, and the user&apos;s new token is revoked with it. Either way the chain
          ends and both parties have to log in again. That is the design working.
        </p>
        <p>
          The note leaves out two things. Revoking refresh tokens does not recall an access token
          that has already been issued: a JWT is checked by its signature and expiry, so the
          attacker&apos;s kept working until it expired, 4.9 seconds later with a 5-second token,
          up to 15 minutes with a real one. And detection needs the real user to come back. With
          the user away, the attacker refreshed 96 times in a row, a day&apos;s worth of 15-minute
          tokens, without a single error; the reuse was noticed only when the user&apos;s browser
          presented RT0 again. Rotation limits a theft to the user&apos;s absence; when the user
          is away for a week, a maximum lifetime for the whole chain is what limits it further.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          2. Nobody stole anything: one page, two tabs
        </h3>
        <p>
          Now the case the note does not mention. The access token has expired and a page loads
          that makes three API calls at once. Each gets a 401 and goes through the usual
          interceptor: refresh, then retry. All three refreshes carry RT0, because none has come
          back yet to replace it.
        </p>
        <Table
          head={["Client", "page loads", "logged out"]}
          rows={[
            ["2 calls, each refreshes on 401", "200", "200"],
            ["3 calls, each refreshes on 401", "200", "200"],
            ["3 calls, one shared refresh", "200", <Good key="g">0</Good>],
          ]}
        />
        <p>
          Every time. The first refresh rotates RT0 to RT1; the second arrives with RT0, and to the
          server that is exactly what theft looks like. It revokes everything, including the RT1
          it has just issued. One call on the page got its data; the others got a 401 from the
          refresh endpoint, and the app sends the user to the login page.
        </p>
        <p>
          Two browser tabs do the same with a cookie. I opened two tabs of the same site, with the
          refresh token in an HttpOnly cookie, and had both refresh at once:
        </p>
        <Table
          head={["Two tabs, Chromium 153", "trials", "logged out"]}
          rows={[
            ["plain fetch", "30", "30"],
            ["refresh inside navigator.locks", "30", <Good key="g">0</Good>],
          ]}
        />
        <p>
          Two same-origin iframes gave the same 30 and 0. How close is &ldquo;at once&rdquo;? I
          delayed every refresh response by 100 ms to stand in for the network, and started the
          second refresh 0 to 150 ms after the first. Every gap up to 90 ms logged the user out,
          20 times out of 20; from 110 ms on, none did. The window is one round trip, however long
          the network makes it. Refreshes that start within one round trip of each other are
          ordinary: the parallel requests of one page after its token expired, or, I would expect,
          every open tab waking together when a laptop comes out of sleep.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          3. A response that never arrived
        </h3>
        <p>
          The third honest reuse needs only one request. The client sends RT0, the server rotates
          it and commits, and the response is lost: a proxy times out, a phone changes networks.
          The client still holds RT0, so it retries with RT0. I made the server answer after
          300 ms and the client give up after 200 ms: 50 retries out of 50 were treated as theft
          and ended the session.{" "}
          <a href="https://developer.okta.com/docs/guides/refresh-tokens/main/" target="_blank" rel="noopener noreferrer" className={link}>Okta&apos;s documentation</a>{" "}
          gives this exact case, users on poor connections whose new tokens never reach the app,
          as the reason its grace period exists.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          4. The race in the check itself
        </h3>
        <p>
          My first server followed the note in order: read the token, check it has not been used,
          issue the next one, mark the old one used. Three statements, no lock. With two refreshes
          at once it did something I did not expect: almost nobody was logged out.
        </p>
        <Table
          head={["Server", "2 refreshes at once", "logged out", "two live tokens"]}
          rows={[
            ["read, check, then write", "200", "1", "199"],
            ["one atomic UPDATE", "200", "200", <Good key="g">0</Good>],
          ]}
        />
        <p>
          Both requests read &ldquo;unused&rdquo; before either wrote &ldquo;used&rdquo;, so both
          got a new token. The single-use token was used twice, the family now had two valid
          refresh tokens, and the one the page did not keep stays valid, held by no one, until it
          expires. With the 100 ms response delay, gaps of 0 to 1 ms produced two tokens every
          time, 2 to 3 ms a mix, and 5 to 50 ms a logout every time. The race covered only a few
          milliseconds, the time between the SELECT and the UPDATE, but on my machine that is
          where the parallel requests of one page landed.
        </p>
        <p>The fix is to check and claim the token in one statement:</p>
        <pre className={pre}>
{`UPDATE refresh_tokens
SET    used_at = now()
WHERE  token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL
RETURNING id, user_id, family_id;
-- one row: this request owns the rotation
-- no row:  unknown, revoked or already used; find out which`}
        </pre>
        <p>
          A second UPDATE on the same row waits for the first to commit, re-checks{" "}
          <code>used_at IS NULL</code>, and matches nothing. That makes the token genuinely
          single-use, and it turns the collisions from section 2 into logouts 200 times out of
          200. The buggy version had been hiding the problem. A correct implementation of the note
          has to decide what to do when its own user reuses a token.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          5. A grace window, built two ways
        </h3>
        <p>
          The usual answer is a short window during which the previous token is still accepted.
          Okta calls it a grace period, 30 seconds by default and configurable from 0 to 60;{" "}
          <a href="https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation" target="_blank" rel="noopener noreferrer" className={link}>Auth0</a>{" "}
          calls it a rotation overlap period. If you build your own, there are two obvious ways to
          answer inside the window: return the successor you already issued, or issue another
          one. I built both, with a one-second window:
        </p>
        <Table
          head={["Inside the window", "3-call page, logged out", "lost response, logged out", "extra live tokens", "thief replays in time"]}
          rows={[
            ["nothing (no window)", "200 / 200", "50 / 50", "none", "caught"],
            ["return the successor", <Good key="a">0 / 200</Good>, <Good key="b">0 / 50</Good>, <Good key="c">none</Good>, <Good key="d">caught at its next refresh</Good>],
            ["issue another token", "0 / 200", "0 / 50", "one per collision", "not caught in 8 rounds"],
          ]}
        />
        <p>
          Both remove the logouts. Only one keeps the detection. Returning the successor means a
          thief who replays RT0 in time receives the same RT1 the user holds; once the window has
          closed, whichever of them uses RT1 second is caught, and in my run that was the
          attacker&apos;s next refresh. Issuing another token forks the family: the user carries
          on along one chain, the thief along another, and neither ever presents a used token
          again. After eight more rounds of refreshes on both sides, the family still had two
          active tokens and no reuse had been detected. The same fork happened on every page load
          with parallel calls, and each one left behind a valid refresh token that nobody holds.
        </p>
        <p>
          Returning the successor means keeping it for the length of the window, in Redis or
          wherever you keep short-lived state, and saving it before the transaction commits. The
          second request is waiting on the first one&apos;s row lock and runs the moment it
          commits; a successor saved after the commit may not be there yet.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          6. Fix the client as well
        </h3>
        <p>
          The window does not make parallel refreshes free: each still replays or rotates, and
          each is a trip to the database. The client should refresh once. Within a page that is
          one shared promise; across tabs it is the{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API" target="_blank" rel="noopener noreferrer" className={link}>Web Locks API</a>,
          available in every major browser since March 2022:
        </p>
        <pre className={pre}>
{`let inflight = null;

// One refresh per page, and one per origin at a time across tabs.
function refreshTokens() {
  inflight ??= navigator.locks
    .request("refresh-token", async () => {
      const res = await fetch("/auth/refresh", { method: "POST" });
      if (!res.ok) throw new Error("session ended");
    })
    .finally(() => { inflight = null; });
  return inflight;
}`}
        </pre>
        <p>
          The shared promise took the three-call page to 0 logouts in 200, and the lock took the
          two tabs to 0 in 30. The second tab still refreshes, but only after the first has
          finished and the browser has stored the new cookie, so it sends RT1 instead of RT0. The
          client fix cannot help with a lost response, though; only the server&apos;s window can.
          You need both. Workers on a server have the same problem and a different fix, a lock per
          shop, which I wrote about in the{" "}
          <Link href="/blog/shopee-oauth-token-lifecycle-at-scale" className={link}>Shopee token post</Link>.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">
          7. Revoke what, exactly?
        </h3>
        <p>
          The note says to revoke every active refresh token. Read as &ldquo;every token the user
          has&rdquo;, one collision in one browser logs the user out everywhere. I logged one user
          in on three devices and made two tabs collide on the first:
        </p>
        <Table
          head={["On reuse, revoke", "device 1", "devices 2 and 3"]}
          rows={[
            ["every token of the user", "logged out", "logged out"],
            ["the family (one login's chain)", "logged out", <Good key="g">still signed in</Good>],
          ]}
        />
        <p>
          RFC 9700 asks for the second: revoke the active refresh token of that grant. A family id
          on each token, set at login and copied on every rotation, is enough to find it.
          Narrowing the scope does not stop the logout on device 1; that takes sections 5 and 6.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">What the notes say now</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Rotate on every refresh, and claim the old token with one atomic UPDATE.</strong>{" "}
            Read-then-write let a single-use token be used twice 199 times in 200.
          </li>
          <li>
            <strong>An old token coming back is usually your own client.</strong> Parallel calls,
            a second tab, a lost response: of the four ways an old token came back in this post,
            one was a thief.
          </li>
          <li>
            <strong>Give the previous token a short window, and inside it return the token you
            already issued.</strong> Issuing another one forks the family and hides a thief for
            good.
          </li>
          <li>
            <strong>Refresh once per page, and once per origin at a time.</strong> A shared
            promise and <code>navigator.locks</code>.
          </li>
          <li>
            <strong>On reuse, revoke the family, not the user.</strong>
          </li>
          <li>
            <strong>Revocation does not recall access tokens, and detection waits for the real
            user.</strong> Keep access tokens short and cap the lifetime of a family.
          </li>
        </ul>
        <p>
          The note was right about the thief. What it never asked is who else sends an old refresh
          token. In this post it was a second tab, a page&apos;s parallel requests and a lost
          response, and every one of them was the real user.
        </p>
      </div>
  ),
};

export default post;
