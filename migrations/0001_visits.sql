-- Nhật ký lượt truy cập, thay cho Instant Logs / Logpush của Cloudflare.
--
-- Vì sao phải tự ghi: cả hai công cụ xem IP của Cloudflare đều KHÔNG có trên
-- gói Free của zone này. Instant Logs chỉ có từ gói Business trở lên, Logpush
-- từ Pro/Workers Paid. Web Analytics thì có, nhưng nó cố ý không lưu IP —
-- không cookie, không danh tính, chỉ số liệu tổng hợp. Muốn biết "IP nào đã
-- xem" thì chỉ còn cách tự ghi ở Worker, nơi Cloudflare đã đưa sẵn IP thật
-- trong header `cf-connecting-ip` và vị trí trong `request.cf`.
--
-- Vì sao D1 chứ không phải KV: mỗi lượt xem là một hàng mới, cần đọc theo
-- khoảng thời gian và gộp theo IP. KV không truy vấn được kiểu đó — sẽ phải
-- đọc toàn bộ rồi lọc ở Worker, và mỗi lượt ghi là một lượt gọi KV tính vào
-- hạn mức 100.000/ngày. D1 free tier tính theo SỐ HÀNG (5 triệu đọc,
-- 100.000 ghi mỗi ngày) nên một trang cá nhân vài trăm lượt xem/tháng còn
-- cách hạn mức rất xa.
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Mốc thời gian mili-giây (UTC). Số nguyên chứ không phải chuỗi ISO: so
  -- sánh và cắt theo khoảng ngày rẻ hơn, và không dính bẫy múi giờ khi lọc.
  ts INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  -- Tên nhà mạng (`asOrganization`): "Viettel", "FPT Telecom", "Google LLC"…
  -- Đây mới là thứ trả lời được câu "ai xem" — một dãy số IP thì không.
  asn TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  -- Nguồn dẫn tới: Google, Facebook, hay gõ thẳng địa chỉ.
  referer TEXT NOT NULL DEFAULT '',
  ua TEXT NOT NULL DEFAULT '',
  -- Đánh dấu ngay lúc ghi thay vì lọc lúc đọc: chuỗi user-agent dài, đem so
  -- khớp lại cho hàng nghìn hàng mỗi lần mở trang quản trị thì phí.
  bot INTEGER NOT NULL DEFAULT 0
);

-- Mọi câu truy vấn đều là "N ngày gần đây, mới nhất trước".
CREATE INDEX visits_ts ON visits(ts DESC);

-- Gộp theo người xem — cách nhìn mặc định của trang /admin/visitors.
CREATE INDEX visits_ip ON visits(ip);
