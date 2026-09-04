-- Thêm thông tin đường truyền, và sửa chỗ đo độ trễ bị rỗng.
--
-- Vì sao cần: hai lượt thử trên CÙNG một chiếc iPhone 12 chạy iOS 27 cho ra
-- hai chuỗi nhận dạng mâu thuẫn nhau —
--
--   Chrome:  "CPU iPhone OS 27_0_0 ... CriOS/152"   (số hệ điều hành ĐÚNG)
--   Safari:  "CPU iPhone OS 18_7 ... Version/27.0"  (số hệ điều hành SAI, bị
--                                                    đóng băng; số đúng nằm
--                                                    ở Version/)
--
-- Nên không thể đọc phiên bản iOS bằng một quy tắc chung. Phần suy luận đó
-- nằm ở tầng hiển thị (`src/app/admin/visitors/page.tsx`), còn ở đây chỉ bổ
-- sung những thứ phải hỏi trình duyệt mới biết.

-- Loại kết nối trình duyệt tự khai: "4g", "3g", "wifi"… Trả lời được câu
-- "đang dùng 4G hay Wi-Fi" mà tên nhà mạng không nói ra: VNPT vừa bán cáp
-- quang vừa bán VinaPhone, nhìn `asn` thôi thì không phân biệt được.
ALTER TABLE visits ADD COLUMN net TEXT NOT NULL DEFAULT '';

-- Băng thông ước lượng (Mbps × 10, giữ số nguyên để khỏi lưu số thực).
ALTER TABLE visits ADD COLUMN downlink INTEGER NOT NULL DEFAULT 0;

-- Độ trễ do TRÌNH DUYỆT đo. Cần vì cột `rtt` (Cloudflare đo ở tầng TCP) luôn
-- rỗng với HTTP/3: HTTP/3 chạy trên QUIC/UDP, không có bắt tay TCP để mà đo.
-- Đúng những khách hiện đại nhất — dùng trình duyệt mới, mạng tốt — lại là
-- nhóm rơi vào lỗ hổng này.
ALTER TABLE visits ADD COLUMN rtt_client INTEGER NOT NULL DEFAULT 0;

-- Trình duyệt chạy trong ứng dụng khác (Messenger, Zalo, Instagram). Với một
-- trang cá nhân hay được chia sẻ qua tin nhắn thì đây là nhóm đáng kể, và
-- chuỗi nhận dạng của chúng trông gần như Safari thường.
ALTER TABLE visits ADD COLUMN webview TEXT NOT NULL DEFAULT '';
