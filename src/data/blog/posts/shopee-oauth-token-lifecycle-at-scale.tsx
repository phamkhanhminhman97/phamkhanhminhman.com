import type { BlogPost } from "../types";

const post: BlogPost = {
  slug: "shopee-oauth-token-lifecycle-at-scale",
  date: "2026-08-24",
  category: "OAuth / Distributed Systems",
  availableIn: ["en", "vi"],
  title: {
    en: "Three calls get you a Shopee token. Keeping it alive is the hard part.",
    vi: "Lấy token Shopee thì ba dòng. Giữ cho nó sống mới mệt.",
  },
  readTime: { en: "9 min read", vi: "9 phút đọc" },
  description: {
    en: "The quick start is three functions long and works first try against your own test shop. What it leaves out: the auth endpoints sign differently from every other call, the refresh token is single-use so two workers will quietly kill each other's copy, and the thing that actually expires is the seller's authorization — which you cannot read from the token in your hand.",
    vi: "Quick start có ba hàm, cắm vào shop test là chạy ngay lần đầu. Còn mấy thứ nó không nói: ba endpoint auth ký khác cả package, refresh token xài một lần nên hai worker sẽ đạp lên nhau, và cái hết hạn thật sự lại là uỷ quyền của seller — thứ nhìn token đang cầm không suy ra được.",
  },
  content: {
    en: () => (
    <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
      <p>
        Shopee&apos;s authorization flow looks small, and it is.{" "}
        <code>generateAuthLink()</code> gives you a link for the seller to click,{" "}
        <code>fetchToken()</code> trades the auth code for a token,{" "}
        <code>refreshToken()</code> renews it before it lapses. Ask any AI and you get those
        three calls in thirty seconds. Point them at your own test shop and they work.
      </p>
      <p>
        I wrote <code>shopee-api-client</code>, so I can tell you those three functions
        really are all there is. They sign a request and send it. They have no idea how many
        other processes of yours are holding the same refresh token, no idea whether the
        seller has revoked access, and they remember nothing between two calls. All three
        problems below live on the far side of that line, and all three stay perfectly quiet
        while you test one shop on one machine.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        1. The three auth endpoints sign differently from the rest of the package
      </h3>
      <p>
        Every call that needs a token — <code>getOrders</code>, <code>updateStock</code>,
        nearly the whole package — folds <code>accessToken</code> and <code>shopId</code>{" "}
        into the string it signs:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// common/helper.ts
function signRequest(path, config, timestamp) {
  const { partnerId, accessToken, shopId, partnerKey } = config;
  const params = [partnerId, path, timestamp.toString(), accessToken, shopId]
    .filter((item) => item !== null && item !== undefined);
  const baseString = params.reduce((prev, curr) => (prev += curr), '');
  return createHmac('sha256', partnerKey).update(baseString).digest('hex');
}`}
      </pre>
      <p>
        The auth endpoints cannot sign that way, because at the moment you call them you do
        not have a token yet. Their signing string is three parts and nothing else:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// common/helper.ts
function signPublicRequest(path, config, timestamp) {
  const { partnerId, partnerKey } = config;
  const baseString = \`\${partnerId}\${path}\${timestamp}\`;
  return createHmac('sha256', partnerKey).update(baseString).digest('hex');
}`}
      </pre>
      <p>
        Read the source and something looks off: only <code>generateAuthLink</code> calls
        that helper. Both token functions re-implement the same formula inline, each with its
        own <code>createHmac</code>. One rule, three copies. Anyone opening that file wants
        to tidy it up.
      </p>
      <p>
        Tidy it if you like, but not by routing them through <code>signRequest</code>. It
        looks safe: <code>accessToken</code> is <code>undefined</code> at that point, so
        surely it just falls out of the string. It does fall out, and that is exactly the
        problem — the <code>.filter()</code> swallows every null and undefined, so nothing
        throws, nothing warns, and you get back a signature that is perfectly well-formed and
        completely wrong. Meanwhile <code>shopId</code> is usually sitting right there in the
        config, so it gets appended quite happily.
      </p>
      <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
        What you get is a signature error on exactly the three auth endpoints. And a
        signature error while fetching a token reads identically to an auth code that was
        already used, or a refresh token that expired. So the afternoon goes into clicking
        through the authorization link again for a fresh auth code, and nobody circles back
        to suspect the <code>.filter()</code> line that was just written to keep things
        clean.
      </blockquote>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        2. The refresh token is shared state, not a config field
      </h3>
      <p>
        Right above <code>fetchTokenWithRefreshToken</code> I copied a few numbers from
        Shopee&apos;s docs, along with the date they were last updated: 2022-09-28. Treat
        them as reference values — check the current docs before you hardcode any of them:
      </p>
      <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
        The refresh token is single-use, and every call returns a new one. A fresh access
        token lives 4 hours, a fresh refresh token 30 days. After a refresh, the old access
        token stays valid for another 5 minutes and the old refresh token for another 4
        hours.
      </blockquote>
      <p>
        Those two trailing windows are not Shopee being generous. They exist so requests
        already in flight with the old token do not die for nothing while another process
        finishes refreshing. Practically: a token cache a few minutes old is fine to use, but
        a cache older than 4 hours holds a refresh token that is already garbage — and you
        find out at the exact moment you call <code>refreshToken()</code> and eat the error.
      </p>
      <p>
        The expensive words are &ldquo;single-use&rdquo;. They turn the refresh token from a
        config field into a contended resource. Two workers both notice shop X is close to
        expiry, both read the same refresh token out of the database, and both call:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`Worker A reads refresh_token = "R1"
Worker B reads refresh_token = "R1"   // nobody has written to the DB yet

Worker A: POST R1  ->  new access_token, refresh_token = "R2"
Worker B: POST R1  ->  error, R1 has already been consumed

A writes R2 to the DB.
B retries with R1, which is dead for good, and retries forever.`}
      </pre>
      <p>
        The package cannot save you here, and I never intended it to.{" "}
        <code>refreshToken()</code> fires exactly one HTTP request and hands back the result;
        it has no way of knowing who else is running alongside it. Coordination belongs to
        the application layer. And this is precisely the class of bug that a one-shop,
        one-process dev environment is built to never reproduce.
      </p>
      <p>
        The fix is a lock per <code>shopId</code>, not a global one that makes every shop
        queue behind every other:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`async function refreshShopToken(shopId: string) {
  const lockKey = \`shopee:refresh:\${shopId}\`;
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 30);
  if (!acquired) return; // another worker is refreshing this shop

  try {
    const fresh = await db.getShopeeConfig(shopId); // re-read AFTER taking the lock
    const shopee = new ShopeeModule(fresh);
    const token = await shopee.refreshToken();
    await db.saveShopeeToken(shopId, token); // write immediately, do not batch
  } finally {
    await redis.del(lockKey);
  }
}`}
      </pre>
      <p>
        The two comments in there carry most of the weight. Read the config before you win
        the lock and you still hit the exact race above — just milliseconds later, and much
        harder to believe you still have a bug. Batch the token writes to save round trips
        and you stretch the window where a refresh token that has already been consumed is
        still sitting in another process&apos;s memory, still assumed good.
      </p>
      <p>
        Same idea applies to the module object itself. <code>setConfig()</code> does not
        return a new config, it overwrites in place:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// module/shopee/index.ts
setConfig(config: ShopeeConfig) {
  Object.assign(this.config, config);
}`}
      </pre>
      <p>
        Keeping one shared <code>ShopeeModule</code> and calling <code>setConfig()</code>{" "}
        whenever the shop changes is what almost everyone writes first — I wrote it that way
        too. It behaves until two requests overlap: shop A&apos;s request is waiting on the
        network, shop B&apos;s request swaps the config, and when A wakes up it signs with
        B&apos;s token. No exception, nothing in the logs — just a valid API call sent to the
        wrong shop. The outcome depends on network ordering, so do not expect to reproduce it
        by clicking around.
      </p>
      <p>
        The package ships a type describing the shape you actually want, but it is only a
        type, with no logic attached:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// config.request.ts
export interface ShopeeConfigList {
  [shopId: string]: ShopeeConfig;
}`}
      </pre>
      <p>
        So the rule is simpler than hunting for places that need locking: <code>new</code> a{" "}
        <code>ShopeeModule</code> per request, with the config read fresh from the database
        for that request&apos;s <code>shopId</code>. One instance serves one shop for its
        whole life. You pay one small object per request and the entire class of bug stops
        existing.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        3. Authorization — the layer refresh tokens cannot reach
      </h3>
      <p>
        Both sections above quietly assume there is still something left to refresh. Access
        and refresh tokens are one layer, and code can rotate them on its own. The
        seller&apos;s authorization is the layer underneath, and your code cannot create it.
        Once it expires, <code>refreshToken()</code> fails even when the refresh token in
        your hand is valid by every number you stored — there is simply nothing behind it to
        renew against.
      </p>
      <p>
        The awkward part is that no API answers &ldquo;how many days of authorization does
        this shop have left&rdquo;, and you cannot infer it from the token you are holding.
        The only channel is the webhook. Shopee gives you a week of warning through push code{" "}
        <code>12</code>:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`{
  "code": 12,
  "data": {
    "shop_expire_soon": [23213, 243242, 342343],
    "expire_before": 1619740800
  }
}`}
      </pre>
      <p>
        Miss that push and you learn the other way: one shop&apos;s sync jobs start failing
        in bulk and no amount of retrying brings them back. The only recovery is the seller
        re-authorizing by hand, which means you need to be able to reach them, which is why
        that week of warning is worth far more than the effort of persisting one webhook.
      </p>
      <p>
        There is one more trap on this layer, the kind that anyone testing with their own
        shop walks straight past. Authorization comes in two flavours, and the code makes you
        pick exactly one:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// fetchTokenWithAuthCode
if (!shopId && !mainAccountId) {
  throw new Error('[Shopee API] fetchToken requires either shopId or mainAccountId in config.');
}
if (shopId && mainAccountId) {
  throw new Error('[Shopee API] fetchToken accepts only one of shopId or mainAccountId.');
}`}
      </pre>
      <p>
        A seller authorizing a single shop comes through <code>shopId</code>. A main account
        authorizing a batch of shops comes through <code>mainAccountId</code>, and the{" "}
        <code>SHOP_AUTHORIZATION</code> webhook then returns <code>shop_id_list</code>. The
        types keep both fields optional, which matches reality: the first flavour carries{" "}
        <code>shop_id</code>, the second carries <code>shop_id_list</code>.
      </p>
      <p>
        A handler that only reads <code>shop_id</code> works flawlessly all through
        development, because you test with one shop. Then comes the first main account
        authorizing twelve shops, and you fetch a token for exactly none of them. No
        exception, no error log — just twelve shops quietly absent from your system until
        someone asks why their orders never arrived.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">Where the line sits</h3>
      <p>
        These are not three separate bugs. They are the same misunderstanding showing up
        three times: mistaking a transport client for a lifecycle manager. The package signs
        requests and sends them, and it does that part well. Who is allowed to refresh, who
        gets to write the result, which shop&apos;s config is sitting in which instance, what
        happens when a seller stops agreeing — those questions were always yours.
      </p>
      <p>
        If you only take one thing from this, take this one: run two workers refreshing the
        same shop at the same time. Under thirty lines of code. It is the difference between
        a system you actually understand and a system that has only been lucky.
      </p>
    </div>
    ),
    vi: () => (
    <div className="font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify space-y-6">
      <p>
        Nhìn qua thì luồng uỷ quyền của Shopee gọn thật.{" "}
        <code>generateAuthLink()</code> ra link cho seller bấm,{" "}
        <code>fetchToken()</code> đổi cái auth code lấy token,{" "}
        <code>refreshToken()</code> gia hạn khi sắp hết. Hỏi AI thì nó viết ra đúng ba dòng
        đó trong ba mươi giây, cắm vào shop test là chạy.
      </p>
      <p>
        Mình viết package <code>shopee-api-client</code>, và ba hàm đó đúng là chỉ có vậy
        thật. Nó ký request rồi gửi đi, hết. Nó không biết ngoài kia còn bao nhiêu tiến
        trình của bạn đang cầm chung một refresh token, không biết seller đã rút quyền hay
        chưa, giữa hai lần gọi thì nó chẳng nhớ gì. Ba chỗ dưới đây đều nằm ngoài cái ranh
        giới ấy, và cả ba đều im re khi bạn test một shop trên một máy.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        1. Ba endpoint auth ký khác cả package
      </h3>
      <p>
        Mấy API cần token — <code>getOrders</code>, <code>updateStock</code>, gần như cả
        package — nối <code>accessToken</code> với <code>shopId</code> vào chuỗi ký:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// common/helper.ts
function signRequest(path, config, timestamp) {
  const { partnerId, accessToken, shopId, partnerKey } = config;
  const params = [partnerId, path, timestamp.toString(), accessToken, shopId]
    .filter((item) => item !== null && item !== undefined);
  const baseString = params.reduce((prev, curr) => (prev += curr), '');
  return createHmac('sha256', partnerKey).update(baseString).digest('hex');
}`}
      </pre>
      <p>
        Ba endpoint auth thì không nối kiểu đó được, vì lúc gọi chúng bạn còn chưa có token
        nào trong tay. Chuỗi ký của chúng vỏn vẹn ba thành phần:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// common/helper.ts
function signPublicRequest(path, config, timestamp) {
  const { partnerId, partnerKey } = config;
  const baseString = \`\${partnerId}\${path}\${timestamp}\`;
  return createHmac('sha256', partnerKey).update(baseString).digest('hex');
}`}
      </pre>
      <p>
        Đọc source sẽ thấy hơi kỳ: chỉ <code>generateAuthLink</code> gọi tới cái helper
        trên. Hai hàm lấy token thì viết lại y hệt công thức đó ngay trong thân hàm, mỗi hàm
        một cục <code>createHmac</code> riêng. Một quy tắc, ba chỗ code. Ai vào đọc cũng
        thấy ngứa mắt và muốn gom lại.
      </p>
      <p>
        Gom thì được, nhưng đừng gom vào <code>signRequest</code>. Thoạt nhìn hợp lý: lúc đó{" "}
        <code>accessToken</code> đang <code>undefined</code>, tưởng đâu nó tự rụng khỏi
        chuỗi. Nó rụng thật, và đó mới là chỗ đau — dòng <code>.filter()</code> nuốt sạch
        mọi giá trị null với undefined, nên hàm không ném lỗi, không log gì, cứ thế trả về
        một chữ ký đúng định dạng mà sai nội dung. Còn <code>shopId</code> thì thường vẫn
        nằm sẵn trong config, nên nó được nối vào chuỗi ký ngon lành.
      </p>
      <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
        Cái bạn nhận về là lỗi chữ ký ở đúng ba endpoint auth. Mà lỗi chữ ký lúc đang đi lấy
        token thì nhìn y chang auth code đã xài rồi, hoặc refresh token hết hạn. Thế là mất
        cả buổi chiều bấm lại link uỷ quyền xin auth code mới, chứ không ai quay lại ngờ cái
        dòng <code>.filter()</code> vừa viết cho gọn.
      </blockquote>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        2. Refresh token là trạng thái dùng chung, không phải một field trong config
      </h3>
      <p>
        Ngay trên <code>fetchTokenWithRefreshToken</code> mình có chép lại mấy con số từ doc
        Shopee, kèm ngày cập nhật 28/09/2022. Cứ coi là số tham khảo; trước khi hardcode thì
        mở doc hiện tại xem lại đã:
      </p>
      <blockquote className="border-l-4 border-red-700 pl-4 italic text-zinc-600 text-sm">
        Refresh token xài một lần, và mỗi lần gọi luôn trả về refresh token mới. Token mới
        thì access sống 4 tiếng, refresh sống 30 ngày. Sau khi refresh, access token cũ còn
        hiệu lực thêm 5 phút, refresh token cũ còn thêm 4 tiếng.
      </blockquote>
      <p>
        Hai cái đuôi 5 phút với 4 tiếng đó không phải Shopee tiện tay cho thêm. Nó để mấy
        request đang bay dở với token cũ khỏi chết oan trong lúc một tiến trình khác vừa
        refresh xong. Nói cho dễ dùng: cache token vài phút tuổi thì cứ xài, còn cache để
        quá 4 tiếng thì refresh token trong đó thành rác rồi, mà bạn chỉ biết vào đúng lúc
        gọi <code>refreshToken()</code> và ăn lỗi.
      </p>
      <p>
        Đắt nhất là chữ &ldquo;xài một lần&rdquo;. Nó biến refresh token từ một field trong
        config thành thứ có tranh chấp. Hai worker cùng thấy token shop X sắp hết hạn, cùng
        đọc một refresh token từ DB, cùng gọi lên:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`Worker A đọc refresh_token = "R1"
Worker B đọc refresh_token = "R1"   // chưa ai kịp ghi DB

Worker A: POST R1  ->  access_token mới, refresh_token = "R2"
Worker B: POST R1  ->  lỗi, R1 đã được tiêu thụ

A ghi R2 vào DB.
B retry với R1, thứ đã chết vĩnh viễn, và retry mãi.`}
      </pre>
      <p>
        Package không đỡ được chuyện này, và mình cũng không định làm nó đỡ.{" "}
        <code>refreshToken()</code> bắn đúng một HTTP request rồi trả kết quả về; nó không
        có cửa nào biết ngoài kia còn ai đang chạy song song. Điều phối là việc của tầng
        app. Mà đây đúng là loại lỗi mà môi trường dev một shop một process sinh ra để không
        bao giờ tái hiện.
      </p>
      <p>
        Chữa thì khoá theo từng <code>shopId</code>, đừng khoá toàn cục bắt mọi shop xếp
        hàng sau lưng nhau:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`async function refreshShopToken(shopId: string) {
  const lockKey = \`shopee:refresh:\${shopId}\`;
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 30);
  if (!acquired) return; // worker khác đang refresh shop này

  try {
    const fresh = await db.getShopeeConfig(shopId); // đọc lại SAU khi có lock
    const shopee = new ShopeeModule(fresh);
    const token = await shopee.refreshToken();
    await db.saveShopeeToken(shopId, token); // ghi ngay, không batch write
  } finally {
    await redis.del(lockKey);
  }
}`}
      </pre>
      <p>
        Hai cái comment trong đoạn trên là phần quan trọng nhất. Đọc config trước khi giành
        được lock thì vẫn dính đúng cái race vừa rồi, chỉ là dính muộn hơn vài mili giây và
        khó tin là mình còn bug hơn. Còn gom token lại ghi một lượt cho tiết kiệm thì kéo
        dài quãng thời gian mà một refresh token đã bị tiêu thụ vẫn nằm trong RAM process
        khác, và vẫn được tưởng là còn tốt.
      </p>
      <p>
        Cùng kiểu đó với chính cái module. <code>setConfig()</code> không trả về config mới,
        nó ghi đè tại chỗ:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// module/shopee/index.ts
setConfig(config: ShopeeConfig) {
  Object.assign(this.config, config);
}`}
      </pre>
      <p>
        Giữ một instance <code>ShopeeModule</code> dùng chung rồi <code>setConfig()</code>{" "}
        mỗi lần đổi shop là cách gần như ai cũng viết đầu tiên, mình cũng từng viết vậy.
        Chạy ngon cho tới lúc có hai request chồng nhau: request shop A đang chờ mạng,
        request shop B nhảy vào đổi config, A tỉnh dậy ký tiếp bằng token của B. Không
        exception, không gì hết — chỉ là một lời gọi API hợp lệ gửi nhầm shop. Kết quả phụ
        thuộc thứ tự mạng trả về, nên ngồi bấm tay thì đừng mong tái hiện.
      </p>
      <p>
        Trong package có sẵn cái type mô tả đúng hình dạng nên dùng, nhưng chỉ là type,
        không kèm logic:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// config.request.ts
export interface ShopeeConfigList {
  [shopId: string]: ShopeeConfig;
}`}
      </pre>
      <p>
        Nên quy tắc gọn hơn nhiều so với việc đi rà xem chỗ nào cần khoá: mỗi request thì{" "}
        <code>new</code> một <code>ShopeeModule</code>, config đọc tươi từ DB theo đúng{" "}
        <code>shopId</code> của request đó. Một instance phục vụ đúng một shop trong đúng
        đời của nó. Tốn thêm một object mỗi request, đổi lại cả nhóm lỗi này biến mất.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">
        3. Uỷ quyền — tầng mà refresh token với không tới
      </h3>
      <p>
        Hai phần trên đều ngầm giả định là vẫn còn cái gì đó để refresh. Access token với
        refresh token là một tầng, code tự xoay được. Uỷ quyền của seller là tầng dưới, code
        bạn không tự tạo ra nó được. Uỷ quyền hết hạn thì <code>refreshToken()</code> fail,
        kể cả khi refresh token bạn đang cầm vẫn còn hạn theo mọi con số bạn lưu — đơn giản
        là phía sau không còn gì cho nó gia hạn tới nữa.
      </p>
      <p>
        Khó chịu ở chỗ không có API nào để hỏi &ldquo;shop này còn được uỷ quyền mấy
        ngày&rdquo;, mà nhìn token đang cầm cũng không suy ra được. Chỉ có webhook. Shopee
        báo trước một tuần bằng push code <code>12</code>:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`{
  "code": 12,
  "data": {
    "shop_expire_soon": [23213, 243242, 342343],
    "expire_before": 1619740800
  }
}`}
      </pre>
      <p>
        Không hứng cái push này thì bạn biết tin theo kiểu khác: job đồng bộ của một shop tự
        nhiên fail hàng loạt, retry kiểu gì cũng không lên. Muốn sống lại thì phải nhờ seller
        vào bấm uỷ quyền lại từ đầu, tức là phải liên lạc được với người ta. Một tuần báo
        trước vì thế đáng giá hơn nhiều so với công lưu lại một cái webhook.
      </p>
      <p>
        Cũng ở tầng này có một cái bẫy nhỏ mà ai test bằng shop nhà mình cũng đi qua mà
        không thấy. Uỷ quyền có hai kiểu, và code bắt bạn chọn đúng một:
      </p>
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`// fetchTokenWithAuthCode
if (!shopId && !mainAccountId) {
  throw new Error('[Shopee API] fetchToken requires either shopId or mainAccountId in config.');
}
if (shopId && mainAccountId) {
  throw new Error('[Shopee API] fetchToken accepts only one of shopId or mainAccountId.');
}`}
      </pre>
      <p>
        Seller uỷ quyền một shop thì đi đường <code>shopId</code>. Tài khoản mẹ uỷ quyền cả
        loạt shop thì đi đường <code>mainAccountId</code>, và webhook{" "}
        <code>SHOP_AUTHORIZATION</code> lúc đó trả về <code>shop_id_list</code>. Type trong
        package để cả hai field optional, đúng như thực tế: kiểu thứ nhất có{" "}
        <code>shop_id</code>, kiểu thứ hai có <code>shop_id_list</code>.
      </p>
      <p>
        Handler chỉ đọc <code>shop_id</code> sẽ chạy hoàn hảo suốt lúc dev, vì bạn test một
        shop. Tới ngày đầu tiên có tài khoản mẹ uỷ quyền mười hai shop thì bạn lấy token cho
        đúng không shop nào. Không exception, không log lỗi, chỉ là mười hai shop lặng lẽ
        không tồn tại trong hệ thống, cho tới lúc có người hỏi sao đơn của họ không về.
      </p>

      <h3 className="font-sans font-bold text-lg text-black pt-4">Ranh giới nằm ở đâu</h3>
      <p>
        Ba chỗ này không phải ba lỗi rời nhau. Nó là cùng một hiểu nhầm lặp lại ba lần:
        tưởng một cái client vận chuyển là một cái quản lý vòng đời. Package ký request rồi
        gửi, phần đó nó làm tốt. Còn ai được refresh, ai được ghi kết quả, config shop nào
        đang nằm trong instance nào, seller ngừng đồng ý thì làm gì — mấy câu đó luôn là
        phần của bạn.
      </p>
      <p>
        Đọc xong mà chỉ làm được một việc thì làm việc này: bật hai worker cùng refresh một
        shop, cùng lúc. Chưa tới ba chục dòng code. Nhưng nó phân biệt giữa một hệ thống bạn
        thật sự hiểu với một hệ thống mới chỉ đang may.
      </p>
    </div>
    ),
  },
};

export default post;
