-- Làm dày nhật ký lượt xem: đủ chi tiết để trả lời "ai, ở đâu, máy gì" và
-- quan trọng nhất là "có phải người thật không".
--
-- Vòng một chỉ có IP + thành phố + chuỗi User-Agent. Ba thiếu sót:
--
-- 1. Chuỗi User-Agent KHÔNG đáng tin. Máy quét chép nguyên chuỗi của Chrome
--    là chuyện thường; danh sách từ khoá bot chỉ bắt được loại tự khai báo.
-- 2. User-Agent hiện đại đã bị cố tình làm mờ: iPhone 15 và iPhone 12 khai
--    y hệt nhau, Chrome trên Android không còn nói tên máy.
-- 3. Không biết người ta ở lại bao lâu — một lượt tải rồi đi ngay và một
--    lượt đọc hết bài trông giống hệt nhau.
--
-- Cách chữa: ghi thêm mọi thứ Cloudflare biết ở biên (miễn phí, có sẵn trong
-- `request.cf`), rồi để CHÍNH TRÌNH DUYỆT tự khai phần còn lại qua một đoạn
-- script nhỏ. Bằng chứng mạnh nhất cho "người thật" chính là việc script đó
-- chạy được và có người cuộn trang: máy quét gần như không chạy JavaScript,
-- và cái chạy được thì cũng không cuộn, không bấm, không ở lại 30 giây.

-- Mã ngẫu nhiên gắn cho từng lượt tải trang, nhúng vào HTML để trình duyệt
-- biết đường báo ngược lại đúng hàng này. Không dùng id tự tăng vì lúc dựng
-- HTML thì hàng còn chưa ghi xong.
ALTER TABLE visits ADD COLUMN vid TEXT NOT NULL DEFAULT '';

-- Mã máy, lưu trong localStorage của trình duyệt. Đây là thứ nhận ra "vẫn
-- người đó" khi IP di động đổi liên tục — IP Viettel 4G có thể đổi vài lần
-- trong một buổi, còn mã này thì không.
ALTER TABLE visits ADD COLUMN cid TEXT NOT NULL DEFAULT '';

-- 0 = chưa rõ (chỉ thấy request, script chưa báo về)
-- 1 = script đã chạy, gần như chắc chắn là trình duyệt thật
-- 2 = có tương tác thật (cuộn / bấm / ở lại đủ lâu), tức người thật
ALTER TABLE visits ADD COLUMN human INTEGER NOT NULL DEFAULT 0;

-- Ở lại bao nhiêu giây, và cuộn tới bao nhiêu phần trăm bài.
ALTER TABLE visits ADD COLUMN dwell INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visits ADD COLUMN scroll INTEGER NOT NULL DEFAULT 0;

-- --- Cloudflare biết sẵn, không tốn gì để lấy ------------------------------

-- Toạ độ và mã bưu chính của trạm mạng. Không phải chỗ người đó ngồi, nhưng
-- đủ để phân biệt "Đà Nẵng" với "Đà Nẵng nhưng qua VPN ở Singapore".
ALTER TABLE visits ADD COLUMN lat TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN lon TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN postal TEXT NOT NULL DEFAULT '';
-- Múi giờ theo IP. Đem so với múi giờ trình duyệt tự khai (cột `tz_client`)
-- là ra ngay dấu hiệu VPN: hai cái lệch nhau.
ALTER TABLE visits ADD COLUMN tz TEXT NOT NULL DEFAULT '';
-- Trung tâm dữ liệu Cloudflare đã phục vụ (HKG, SIN, SGN…).
ALTER TABLE visits ADD COLUMN colo TEXT NOT NULL DEFAULT '';
-- Phiên bản HTTP và TLS. Máy quét viết bằng script thường dừng ở HTTP/1.1
-- và bộ mã TLS cũ, trong khi trình duyệt thật đi HTTP/2 hoặc HTTP/3.
ALTER TABLE visits ADD COLUMN proto TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN tls TEXT NOT NULL DEFAULT '';
-- Độ trễ mạng đo được ở tầng TCP, tính bằng mili-giây.
ALTER TABLE visits ADD COLUMN rtt INTEGER NOT NULL DEFAULT 0;
-- Cloudflare tự xác minh được là bot đàng hoàng (Googlebot, Bingbot thật).
ALTER TABLE visits ADD COLUMN verified_bot TEXT NOT NULL DEFAULT '';

-- --- Trình duyệt tự khai ---------------------------------------------------

ALTER TABLE visits ADD COLUMN lang TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN screen TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN tz_client TEXT NOT NULL DEFAULT '';
-- Tên chip đồ hoạ lấy qua WebGL: "Apple A17 GPU", "Adreno (TM) 730"… Đây là
-- thứ nói được đời máy khi User-Agent đã bị làm mờ.
ALTER TABLE visits ADD COLUMN gpu TEXT NOT NULL DEFAULT '';
-- Số nhân CPU, RAM (GB), có màn cảm ứng không.
ALTER TABLE visits ADD COLUMN cpu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visits ADD COLUMN ram INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visits ADD COLUMN touch INTEGER NOT NULL DEFAULT 0;
-- Tên máy và phiên bản hệ điều hành, lấy qua User-Agent Client Hints. Trên
-- Android bản Chrome mới, chỗ này ra thẳng tên máy ("Pixel 8", "SM-S918B").
ALTER TABLE visits ADD COLUMN model TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN os_version TEXT NOT NULL DEFAULT '';

-- Trình duyệt báo về theo `vid`, nên đây là chỉ mục nóng nhất khi ghi.
CREATE INDEX visits_vid ON visits(vid);
CREATE INDEX visits_cid ON visits(cid);
