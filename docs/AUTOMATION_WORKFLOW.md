# TÀI LIỆU VẬN HÀNH HỆ THỐNG TỰ ĐỘNG (AUTOMATION WORKFLOW)
*Tài liệu này ghi chú lại toàn bộ logic cốt lõi của hệ thống để làm "kim chỉ nam" khi Deploy lên VPS.*

---

## 1. Môi trường Dev (Test) vs Production (VPS)
- **Production (VPS):** Các Cron Job (Bot tự động) chạy 1 phút/lần đóng vai trò như nhịp tim (Heartbeat). Cứ mỗi phút nó sẽ kiểm tra xem *đã đến giờ* theo cấu hình trên Web hay chưa (VD: 1 tiếng/lần). Nếu chưa đến giờ, nó sẽ bỏ qua.
- **Dev (Máy tính cá nhân):** Hệ thống có một biến `bypassInterval`. Khi ở môi trường Dev, hệ thống sẽ BỎ QUA cấu hình thời gian trên Web và ép chạy mọi quy trình (Cào bài, Tạo video, Đăng video) **liên tục mỗi 1 phút** để phục vụ việc test lỗi nhanh chóng.

---

## 2. Quy trình 3 bước tự động hoàn chỉnh

### BƯỚC 1: BOT CÀO BÀI (Crawler Cron)
- **Nhiệm vụ:** Bay vào các nguồn (RSS/HTML) lấy 5 bài viết mới nhất trên trang chủ của báo nguồn.
- **Cơ chế chống trùng lặp (History):** Trước khi lấy bài, Bot kiểm tra trong CSDL (`ztteam_crawl_history`). Nếu URL bài báo đã tồn tại, nó sẽ bỏ qua. Vì thế, nếu nguồn không có bài mới, Bot sẽ không cào thêm bài nào (không phải lỗi hệ thống).
- **Lưu ý:** Bot đẩy bài lên WordPress dưới trạng thái `Publish` và map đúng `Target Category ID`.

### BƯỚC 2: BOT SẢN XUẤT VIDEO (Render Cron & Processor)
- **Nhiệm vụ:** Tìm các bài viết mới trên WordPress (chưa từng làm video) để đưa vào Hàng Đợi (Queue).
- **Cơ chế Hàng Đợi (Queue):**
  - **Batch Size (Số bài mỗi lần):** Số lượng bài sẽ được bốc vào hàng đợi trong mỗi chu kỳ quét (VD: 1 bài/phút). Dù trên Web có vẻ như tạo 5 video cùng lúc, nhưng thực tế Bot bốc lần lượt 1 bài vào mỗi phút.
  - **Queue Limit (Giới hạn hàng đợi):** Không phải là số video tối đa được tạo, mà là *số lượng video tối đa được phép ĐANG CHỜ + ĐANG RENDER tại cùng 1 thời điểm*. Giúp chống treo máy chủ nếu tốc độ Render quá chậm.
- **Cơ chế chống lặp vô tận (Khắc phục lỗi):**
  - Ngay khi bốc 1 bài ném vào Hàng đợi, hệ thống LẬP TỨC ghi vào Sổ đen Lịch sử (`ztteam_reel_history`). 
  - Nếu video bị lỗi bẩm sinh (VD: không có ảnh), nó sẽ thất bại. Dù người dùng có bấm Xoá Video lỗi trên giao diện, sổ lịch sử vẫn giữ nguyên ➔ Đảm bảo hệ thống KHÔNG BAO GIỜ bị vòng lặp nhặt lại bài đã lỗi.

### BƯỚC 3: BOT XUẤT BẢN FACEBOOK (Publisher Cron)
- **Nhiệm vụ:** Rà soát các video đã `COMPLETED` để đăng lên Facebook.
- **Giãn cách đăng bài (Immediate Gap):** 
  - Khi cấu hình "Đăng ngay", nếu Xưởng Render xong 5 video cùng lúc, Bot sẽ lấy video #1 đăng ngay.
  - Sau đó nó tính thời gian: Đủ `X phút` (VD: 60 phút) kể từ bài trước, nó mới đăng bài #2.
  - Giúp tránh việc Facebook khoá Page vì tình nghi Spam khi đăng dồn dập.

---
**💡 Chú ý cho AI khi bảo trì:** Trước khi Debug bất kỳ tính năng tự động nào, hãy luôn đọc file này để nắm vững khái niệm Batch Size, Queue Limit, và Bypass Interval. Tránh việc sửa code nhầm vì hiểu sai hiện tượng.
