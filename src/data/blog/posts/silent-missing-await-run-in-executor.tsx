import type { BlogPost } from "../types";

const post: BlogPost = {
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
};

export default post;
