import type { BlogPost } from "../types";

const post: BlogPost = {
    slug: "safe-webhook-handling",
    date: "2026-04-15",
    category: "Security",
    title: "Handling Shopee and TikTok Shop webhook pushes safely",
    readTime: "4 min read",
    description: "HMAC signature verification fails for a reason that has nothing to do with the key or the algorithm: one JSON parse-and-reserialize step, done before signature check, is enough to change every byte.",
    content: () => (
      <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
        <p>
          Shopee signs every webhook with <strong>HMAC-SHA256</strong> over the string
          <code> callback_url + request_body</code>. You recompute exactly that formula with
          exactly the right <code>partnerKey</code>, and the signature still does not match.
          The key is not wrong and the algorithm is not wrong — the body you handed to the
          HMAC function is no longer the body Shopee signed, even though the JSON still
          &ldquo;looks&rdquo; identical.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">1. Reproducing it in five lines</h3>
        <p>
          HMAC is a hash over an <strong>exact byte string</strong>. Parsing JSON and
          serializing it back is the kind of transformation that <em>feels</em> like it
          changes nothing — and it does not preserve the original bytes:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`const raw = '{"code":1,"amount":10.50,"shop_id":123}'; // the body Shopee actually signed
const reparsed = JSON.stringify(JSON.parse(raw));         // what you get after express.json()

console.log(raw === reparsed);  // false
console.log(raw);               // {"code":1,"amount":10.50,"shop_id":123}
console.log(reparsed);          // {"code":1,"amount":10.5,"shop_id":123}  <- 10.50 → 10.5`}
        </pre>
        <p>
          <code>10.50</code> and <code>10.5</code> are the same number and two different byte
          strings. HMAC knows nothing about &ldquo;JSON values&rdquo; — it hashes bytes. Two
          different strings mean two different signatures. Run the snippet above through any
          <code> crypto.createHmac(&ldquo;sha256&rdquo;, key)</code> you like and the results
          never line up.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">2. Why this slips through review</h3>
        <p>
          Nobody deliberately writes &ldquo;parse it, serialize it back, then verify&rdquo;.
          It happens implicitly: an <code>express.json()</code> middleware mounted at the app
          level — usually put there for the other routes — runs <em>before</em> the webhook
          route in Express&apos;s middleware chain. By the time the verification code touches{" "}
          <code>req.body</code>, the body has already been parsed into an object, and the
          original bytes are <strong>gone for good</strong>, no matter how carefully you{" "}
          <code>JSON.stringify</code> it back.
        </p>
        <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
          There is no exception and no warning in the logs — signature verification simply
          returns <code>false</code>. It looks exactly like a misconfigured key, which is why
          most of the debugging time goes into re-checking <code>partnerKey</code>, the one
          thing that was never wrong.
        </blockquote>

        <h3 className="font-sans font-bold text-lg text-black pt-4">3. The fix: verify before anything is allowed to parse</h3>
        <p>
          The webhook route has to receive the <strong>raw Buffer</strong>, verify the
          signature against that buffer, and only then <code>JSON.parse</code> it to do the
          actual work — and <code>express.raw()</code> has to sit ahead of every global{" "}
          <code>express.json()</code> on this path:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`app.post(
  "/shopee/webhook",
  express.raw({ type: "application/json" }),   // keep the bytes, do NOT parse
  (req, res) => {
    const signature = req.header("authorization") ?? "";
    const isValid = shopee.verifyPushSignature(
      callbackUrl,
      req.body,      // raw Buffer - exactly the bytes Shopee signed
      signature,
    );
    if (!isValid) return res.status(401).end();

    const payload = shopee.parsePushPayload(req.body); // parse AFTER the signature checks out
    return res.status(204).end();
  },
);`}
        </pre>
        <p>
          The rule in one line: <strong>verify against bytes, and parse only once the
          signature is known to be good.</strong> Swap those two steps — even by accident,
          because a global middleware happens to sit in front — and the signature always
          fails, with no log telling you why.
        </p>

        <h3 className="font-sans font-bold text-lg text-black pt-4">4. Not just Express</h3>
        <p>
          This is not an Express problem. Any framework that parses the JSON body{" "}
          <strong>before</strong> your route handler gets a chance to read the raw bytes has
          the same exposure — the root of it is &ldquo;who touches the original bytes
          first&rdquo;, not the syntax of one particular framework. NestJS (which runs on
          Express by default) hits it in exactly the same way if you do not handle it,
          because it also registers a global body parser at bootstrap.
        </p>
        <p>
          The difference is that Nest ships an official answer, cleaner than carving the
          route out by hand as above:
        </p>
        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`const app = await NestFactory.create(AppModule, { rawBody: true });

// In the controller:
@Post("shopee/webhook")
handleWebhook(@Req() req: RawBodyRequest<Request>) {
  const isValid = shopee.verifyPushSignature(
    callbackUrl,
    req.rawBody,   // the original buffer - kept alongside the already-parsed req.body
    signature,
  );
  if (!isValid) throw new UnauthorizedException();

  const payload = req.body; // already parsed, safe to use AFTER verifying
}`}
        </pre>
        <p>
          With <code>rawBody: true</code>, Nest keeps both <code>req.body</code> (parsed, for
          your logic) and <code>req.rawBody</code> (the original buffer, for verifying the
          signature) — so there is no need to pull the webhook route out of the shared
          parsing path the way <code>express.raw()</code> does above. Frameworks that do not
          parse JSON by default (Next.js Route Handlers, for instance, where you read{" "}
          <code>request.text()</code> yourself) avoid this one for free, without ever having
          to learn about it.
        </p>
      </div>
    ),
};

export default post;
