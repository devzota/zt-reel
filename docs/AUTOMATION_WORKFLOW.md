# TÀI LIỆU VẬN HÀNH HỆ THỐNG TỰ ĐỘNG (AUTOMATION WORKFLOW)
*Tài liệu này ghi chú lại toàn bộ logic cốt lõi của hệ thống để làm "kim chỉ nam" khi Deploy lên VPS.*

---

## 1. Môi trường & Múi giờ (Quan trọng)
- **Chuẩn hóa giờ Việt Nam (UTC+7):** Toàn bộ các hệ thống tự động (Crawler, Renderer, Publisher) đều được khóa cứng múi giờ Việt Nam thông qua biến môi trường `TZ=Asia/Ho_Chi_Minh` trong file `docker-compose.prod.yml`. Mọi câu lệnh gọi giờ (`getHours()`) đều sẽ lấy chính xác giờ Việt Nam để so sánh với cấu hình trên giao diện Web.
- **Tuân thủ tuyệt đối cấu hình (Strict Mode):** Không còn cơ chế `bypassInterval` (chạy tự do mỗi phút trên môi trường Dev). Dù chạy trên máy Dev hay trên VPS, hệ thống **bắt buộc** phải tuân thủ chính xác khoảng cách thời gian đã được cài đặt trên giao diện.

---

## 2. Quy trình 3 bước tự động hoàn chỉnh

### BƯỚC 1: BOT CÀO BÀI (Crawler Cron)
- **Nhiệm vụ:** Quét qua các nguồn báo, lấy bài viết mới.
- **Tính thời gian quét (Strict interval):** Nếu Cấu hình trên Web là `Tần suất: 2 tiếng` (VD cào lúc 14:00), Bot sẽ từ chối chạy cho đến đúng 16:00.
- **Cơ chế chống trùng lặp (History):** Trước khi lấy bài, Bot kiểm tra trong CSDL (`ztteam_crawl_history`). Nếu URL bài báo đã tồn tại, nó sẽ bỏ qua. Nếu nguồn không có bài mới, Bot sẽ không cào thêm bài nào (không phải lỗi hệ thống).
- **Lưu ý:** Bot đẩy bài lên WordPress dưới trạng thái `Publish` và map đúng `Target Category ID`. API trả về `last_crawled_at` và `next_crawl_at` để Giao diện hiển thị giờ chính xác.

### BƯỚC 2: BOT SẢN XUẤT VIDEO (Render Cron & Processor)
- **Nhiệm vụ:** Tìm các bài viết mới trên WordPress để đưa vào Hàng Đợi (Queue).
- **Tính thời gian quét (Strict interval):** Khóa chặt theo cấu hình `Khoảng cách giữa 2 lần quét` của TỪNG Page. (Page A cài 2 tiếng thì 2 tiếng chạy, Page B cài 6 tiếng thì 6 tiếng chạy).
- **Sắp xếp hiển thị:** Video nào vừa làm xong (`COMPLETED`) sẽ có `updated_at` mới nhất và lập tức nhảy lên TOP 1 trong danh sách.
- **Cơ chế Hàng Đợi (Queue):**
  - **Batch Size (Số bài mỗi lần):** Số lượng bài sẽ được bốc vào hàng đợi trong mỗi chu kỳ quét (VD: 1 bài/quét).
  - **Queue Limit (Giới hạn hàng đợi):** *Số lượng video tối đa được phép ĐANG CHỜ + ĐANG RENDER tại cùng 1 thời điểm*. Giúp chống treo máy chủ nếu tốc độ Render quá chậm.
- **Cơ chế chống lặp vô tận (Khắc phục lỗi):**
  - Ngay khi bốc 1 bài ném vào Hàng đợi, hệ thống LẬP TỨC ghi vào Sổ đen Lịch sử (`ztteam_reel_history`). Nếu video bị lỗi bẩm sinh (VD: không có ảnh), nó sẽ thất bại. Dù người dùng có bấm Xoá Video lỗi trên giao diện, sổ lịch sử vẫn giữ nguyên ➔ Đảm bảo hệ thống KHÔNG BAO GIỜ bị vòng lặp nhặt lại bài đã lỗi.

### BƯỚC 3: BOT XUẤT BẢN FACEBOOK (Publisher Cron)
- **Nhiệm vụ:** Rà soát các video đã `COMPLETED` để đăng lên Facebook.
- **Chế độ đăng Khung Giờ Cố Định (Fixed Mode):** Đọc cấu hình Khung giờ của từng Fanpage (VD: 08:00, 12:00, 18:00).
  - **Khóa Bộ Nhớ (Memory Lock):** Đảm bảo trong 1 phút, một Fanpage CHỈ ĐĂNG TỐI ĐA 1 BÀI. Dù có 10 video đang chờ thì chỉ đúng 1 video được bốc ra đăng. Tránh lỗi Spam 5 bài 1 giây.
  - **Khóa Database (DB Lock):** Khi đến khung 12:00, Bot chuẩn bị đăng bài thì lập tức nhìn vào Database: *Có bài nào vừa được đăng cách đây dưới 10 phút không?*. Nếu có -> Hủy đăng (vì slot 12:00 vừa dùng xong). Giúp chặn hoàn toàn việc đăng lặp lại vào phút 12:01, 12:02.
- **Giãn cách đăng bài (Immediate Gap):** 
  - Nếu cấu hình "Đăng ngay", nó tính thời gian: Đủ `X phút` (VD: 60 phút) kể từ bài trước mới được đăng bài tiếp theo.

---
**💡 Chú ý cho AI khi bảo trì:** Hệ thống hiện tại đang trong trạng thái Strict Mode tuyệt đối và tuân thủ múi giờ Việt Nam. Tuyệt đối không chèn lại các biến `bypassInterval` hoặc dùng hàm tính toán bỏ qua múi giờ.
