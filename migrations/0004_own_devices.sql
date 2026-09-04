-- Đánh dấu máy của chính chủ trang.
--
-- Vì sao cần: người mở trang này nhiều nhất chính là mình — mỗi lần sửa xong
-- một chỗ lại vào xem thử. Bốn lượt thử đầu tiên (iPhone 12 Chrome, iPhone 12
-- Safari, Mac mini M4, iPhone 11 Safari) đã chiếm gần hết danh sách "người
-- thật", đẩy khách thật xuống dưới. Không lọc ra thì con số "bao nhiêu người
-- xem" mất hết ý nghĩa.
--
-- Đánh dấu theo `cid` (mã máy trong localStorage) chứ không theo IP: IP nhà
-- và IP 4G đều đổi, còn mã máy thì không. Đổi lại, xoá dữ liệu duyệt web sẽ
-- mất dấu và phải đánh dấu lại — chấp nhận được, vì đây là tiện ích dọn nhiễu
-- chứ không phải cơ chế bảo mật.
CREATE TABLE own_devices (
  cid TEXT PRIMARY KEY,
  -- Tên tự đặt để sau này còn nhớ máy nào: "iPhone 11", "Mac mini M4"…
  label TEXT NOT NULL DEFAULT '',
  added_at INTEGER NOT NULL
);
