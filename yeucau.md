# PRD — HỆ THỐNG QUẢN LÝ & TỰ ĐỘNG SẢN XUẤT NỘI DUNG FANPAGE

## 0. TỔNG QUAN

### 0.1. Mục tiêu
Xây dựng hệ thống web tự động hóa quy trình:
Cào nội dung từ website nguồn → đẩy vào website đích (WordPress) → dùng AI biến bài viết thành reel (caption + voice + video) → tự động đăng reel lên nhiều Fanpage Facebook. Kèm quản lý page, quản lý token và thống kê.

### 0.2. Luồng tổng thể
Website NGUỒN (của người khác) │ cào theo chuyên mục + tần suất (lọc trùng) ▼ Website ĐÍCH của tôi (WordPress) ← kho nội dung trung tâm │ đọc bài qua WordPress REST API ▼ TẠO REEL cho từng Fanpage (theo template riêng của page) │ ▼ ĐĂNG REEL lên Fanpage (tự động theo tần suất)

Điểm cốt lõi: website đích là WordPress → đọc/ghi qua REST API + Application Password, KHÔNG cào website đích. Fanpage lấy nội dung từ website đích, không đụng trực tiếp website nguồn.

### 0.3. Bộ công nghệ (bắt buộc)
| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS + Tailwind CSS |
| Backend | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL |
| Hàng đợi / job nền | Redis + BullMQ |
| Xử lý video | FFmpeg |
| Lưu media | Local (dev) / S3-compatible (prod) |
| Môi trường dev | Docker Compose (Postgres, Redis, FFmpeg) |
| Facebook API | Graph API cố định version v25.0 |
| WordPress API | REST API /wp-json/wp/v2/ + Application Password |
| Voice/TTS | OpenAI TTS-1 (cố định) |
| AI caption | Đa nhà cung cấp (OpenAI / Claude / Gemini) — kiến trúc adapter |

### 0.4. Quy ước bắt buộc
- Chỉ dùng class Tailwind CSS, KHÔNG custom CSS, KHÔNG inline style.
- Comment code dùng định dạng `/** */` (JS/TS/PHP) và `<!-- -->` (HTML/JSX), TUYỆT ĐỐI không dùng `//`.
- Toàn bộ token, mật khẩu ứng dụng, API key mã hóa AES trong DB — không lưu plaintext.
- Mã sạch, module hóa, dễ bảo trì, responsive.
- Mọi tác vụ nặng (cào, AI, render video, đăng bài) chạy nền qua BullMQ, không chạy trong request.
- Mọi request Facebook/WordPress phải xử lý lỗi + retry có backoff.

---

## 1. VAI TRÒ & PHÂN QUYỀN

| Vai trò | Quyền |
|---|---|
| **Admin** | Toàn quyền: quản lý user, tất cả website/page, cấu hình hệ thống, xem mọi thống kê |
| **Manager** | Quản lý website/page được gán, kết nối Facebook, cấu hình cào/tạo reel/đăng, xem thống kê của mình |
| **Editor** | Chỉ soạn/đăng nội dung trên page được giao, không sửa cấu hình hệ thống, không quản lý user |

Ràng buộc: mỗi user chỉ thấy và thao tác trên website/page được gán (Admin thấy tất cả).

---

## 2. MODULE A — XÁC THỰC & NGƯỜI DÙNG
- A1. Đăng nhập bằng email + mật khẩu (hash bcrypt).
- A2. JWT access token + refresh token.
- A3. Guard phân quyền theo vai trò (Admin/Manager/Editor).
- A4. Admin: CRUD người dùng, gán vai trò.
- A5. Gán website/page cho user (bảng `user_assets`).
- A6. Đổi mật khẩu; quên mật khẩu qua email.
- A7. Ràng buộc dữ liệu theo quyền: user chỉ query được asset của mình.

---

## 3. MODULE B — KẾT NỐI FACEBOOK & QUẢN LÝ TOKEN
- B1. Nút "Kết nối Facebook" → luồng Facebook Login → nhận User Access Token ngắn hạn.
- B2. Server đổi sang long-lived user token (`GET /v25.0/oauth/access_token?grant_type=fb_exchange_token`) — chạy server-side vì cần App Secret.
- B3. Gọi `GET /v25.0/me/accounts` bằng long-lived user token → lấy danh sách page + long-lived page token (không hết hạn) → lưu DB (mã hóa).
- B4. Lưu mỗi page: fb_page_id, tên, ảnh, category, follower, nick sở hữu, page token, trạng thái.
- B5. Cron kiểm tra sức khỏe token hằng ngày (`GET /v25.0/{page_id}?fields=name`); lỗi → đánh dấu `expired` + thông báo user kết nối lại.
- B6. Ngắt kết nối 1 nick / 1 page (xóa token).
- B7. Xử lý rate limit Facebook (code 4/17/32/613) → retry backoff.
- B8. Hỗ trợ nhiều nick Facebook (mỗi nick nhiều page).

---

## 4. MODULE C — QUẢN LÝ FANPAGE
- C1. Danh sách page: tên, ảnh, follower, nick sở hữu, trạng thái token, template mặc định, website đích gắn kèm.
- C2. Tìm kiếm, lọc theo nick/trạng thái.
- C3. Gán template reel mặc định cho từng page.
- C4. Chi tiết page: thông tin cơ bản + thống kê nhanh + cấu hình tạo reel + cấu hình đăng.

---

## 5. PHẦN 1 — WEBSITE ĐÍCH (WORDPRESS) + NGUỒN CÀO

### 5.1. Module D1 — Quản lý Website đích (WordPress của tôi)
Màn hình "Thêm website đích", mỗi website điền:
- Link website đích (vd `https://mysite.com`).
- Username WordPress.
- Application Password (mã ứng dụng WP — mã hóa AES) — dùng đẩy bài + upload ảnh qua REST API.
- Kiểm tra kết nối (test call `/wp-json/wp/v2/` xác nhận credentials hợp lệ).
- CRUD website đích; trạng thái kết nối.

### 5.2. Module D2 — Nguồn cào (thuộc từng website đích)
Trong mỗi website đích, thêm nhiều nguồn cào, mỗi nguồn:
- URL website nguồn + chuyên mục nguồn cần lấy.
- Quy tắc trích xuất dạng cấu hình (selector CSS: tiêu đề / nội dung / ảnh) — KHÔNG hardcode, mỗi web nguồn HTML khác nhau.
- Tần suất cào (cron: mỗi giờ / 6 giờ / ngày…).
- Bật / tắt.
- (Tùy chọn) user/pass nếu web nguồn yêu cầu đăng nhập mới xem được.
- CRUD nguồn.

### 5.3. Module D3 — Worker cào & đẩy vào WordPress
- Cron cào theo tần suất từng nguồn.
- Lấy tiêu đề, nội dung text, danh sách ảnh trong bài.
- Lọc trùng theo URL gốc + hash nội dung (phạm vi từng nguồn).
- Upload ảnh vào WP (`POST /wp-json/wp/v2/media`) → tạo bài (`POST /wp-json/wp/v2/posts`) gán đúng chuyên mục + ảnh đại diện.
- Lưu `crawl_history`: bài nguồn → wp_post_id → trạng thái.

### 5.4. Module D4 — Lịch sử cào
- Danh sách bài đã cào: tiêu đề, thời gian, nguồn, wp_post_id, trạng thái (thành công/lỗi).
- Lọc theo website đích / nguồn / thời gian.
- Retry bài đẩy lỗi.

---

## 6. PHẦN 2 — TẠO REEL CHO PAGE (LẤY BÀI TỪ WEBSITE ĐÍCH)

### 6.1. Module E1 — Cấu hình tạo reel (theo từng page)
Vào từng page, cấu hình:
- Chọn website đích (WordPress) để lấy bài.
- Chọn chuyên mục trên website đích (`GET /wp-json/wp/v2/categories` → lọc `posts?categories=ID`).
- Tần suất tạo reel (vd 3 reel/ngày).
- Template reel của page.
- Cấu hình giọng văn caption riêng của page (tông, độ dài).
- Loại trừ bài đã tạo reel cho page này (1 website đích dùng cho nhiều page; mỗi page loại trừ riêng — bài đã dùng cho page A vẫn dùng được cho page B).
- Bật / tắt tự động.

### 6.2. Module E2 — Tích hợp AI (adapter đa nhà cung cấp)
- Thiết kế provider adapter: interface chung `generateCaption(text, options)`.
- Hỗ trợ tối thiểu OpenAI (GPT), Anthropic (Claude), Google (Gemini); API key cấu hình trong settings (mã hóa).
- Cho phép chọn model mặc định + đổi model không sửa code lõi.
- Ghi log token/chi phí mỗi lần gọi AI.

### 6.3. Module E3 — Dây chuyền tạo Reel (chạy nền, mỗi reel = 1 bài × 1 page)
Reel mục tiêu: dọc 9:16, ~15 giây, chủ yếu ghép ảnh tĩnh.
- Bước 1 — Lấy bài mới (chưa dùng cho page này) từ WordPress theo chuyên mục.
- Bước 2 — AI viết caption/kịch bản ~15s theo giọng văn của page.
- Bước 3 — OpenAI TTS-1 đọc kịch bản → audio; lấy độ dài audio.
- Bước 4 — Canh phụ đề theo độ dài audio (subtitle timing).
- Bước 5 — Chuẩn hóa ảnh về 9:16 (ảnh ngang → thêm nền blur cho khít khung dọc).
- Bước 6 — FFmpeg ghép: 4–5 ảnh (mỗi ảnh ~3s + hiệu ứng Ken Burns) + voice + phụ đề chạy + nhạc nền (giảm âm dưới giọng) + template page (logo/khung/font/intro-outro) → xuất MP4 9:16, ~15s.
- Bước 7 — Lưu reel, gắn cho page, đánh dấu bài đã dùng cho page này (`reel_history`).
- Trạng thái: `queued → processing → rendered → failed`, hiển thị tiến độ, retry khi lỗi.
- Giới hạn concurrency render (cấu hình) để không nghẽn VPS.

### 6.4. Module E4 — Template ảnh & Reel
- CRUD template reel: font/màu/vị trí phụ đề, logo (ảnh + vị trí), intro/outro, nhạc nền, kiểu hiệu ứng ảnh (Ken Burns…).
- CRUD template ảnh (nếu đăng dạng ảnh).
- Template lưu dạng `config_json`, worker video đọc vào khi render.
- Preview trước khi lưu; nhân bản; xóa.
- Gán template mặc định cho page.

### 6.5. Module E5 — Lịch sử tạo reel
- Danh sách reel đã tạo: từ bài nào (wp_post_id), page nào, template nào, thời gian, trạng thái.
- Cho phép sửa caption / render lại.
- Lọc theo page / thời gian / trạng thái.

---

## 7. PHẦN 3 — ĐĂNG REEL LÊN PAGE

### 7.1. Module F1 — Cấu hình đăng (theo từng page)
Vào từng page, cấu hình:
- Chọn reel đã tạo cho page (từ Phần 2).
- Tần suất đăng (vd 3 bài/ngày, cách nhau X giờ) + khung giờ đăng.
- Loại trừ reel đã đăng.
- Đăng ngay / hẹn giờ.
- Bật / tắt tự động.

### 7.2. Module F2 — Đăng reel (chạy nền)
- Cron mỗi phút quét reel chưa đăng tới lịch → đẩy `publish-queue`.
- Đăng reel qua Facebook Graph API v25.0: quy trình 3 phase (`start` → upload → `finish`) → poll `GET /v25.0/{video_id}?fields=status` tới `PUBLISHED`.
- Rải lịch: không đăng dồn cùng thời điểm cho tất cả page.
- Trạng thái từng target: `pending → posting → success → failed` + lỗi chi tiết; retry.

### 7.3. Module F3 — Đăng ảnh (bổ trợ)
- Đăng 1 ảnh (`/{page_id}/photos`) hoặc nhiều ảnh (`published=false` → `attached_media` vào `/feed`).
- Đăng lên 1 page hoặc nhiều page cùng lúc.

### 7.4. Module F4 — Lịch sử đăng
- Danh sách reel/bài đã đăng: page nào, lúc nào, fb_post_id, thành công/lỗi.
- Lọc theo page / trạng thái / thời gian; retry bài lỗi.

---

## 8. MODULE G — THỐNG KÊ (INSIGHTS)
- G1. Cron thu thập số liệu hằng ngày từ Facebook: page (follower, reach, engagement), bài (view, like, comment, share) → `page_stats`, `post_stats`.
- G2. Dashboard tổng quan: tổng website/page, tổng bài cào, tổng reel tạo, tổng bài đăng, tỉ lệ thành công.
- G3. Thống kê theo page: biểu đồ follower/reach/engagement theo thời gian.
- G4. Thống kê theo reel/bài: hiệu suất từng bài.
- G5. So sánh giữa các page.
- G6. Thống kê pipeline: số bài cào → số reel tạo → số reel đăng (theo dõi hiệu suất dây chuyền).
- G7. Xuất báo cáo CSV.

---

## 9. MODULE H — VẬN HÀNH & TIỆN ÍCH
- H1. Kho media: quản lý ảnh/video/voice, tái sử dụng, lọc theo loại.
- H2. Nhật ký hoạt động (`activity_logs`): ai làm gì, khi nào.
- H3. Trung tâm thông báo: token hỏng, cào lỗi, đẩy WP lỗi, AI lỗi, render lỗi, đăng lỗi.
- H4. Cài đặt hệ thống: Facebook App ID/Secret, API key AI (mã hóa), OpenAI key, concurrency render, cấu hình chung.
- H5. Nhật ký job nền (`jobs_log`): loại job, trạng thái, thời gian, lỗi, số lần retry.

---

## 10. CƠ CHẾ CHỐNG TRÙNG (LOGIC CỐT LÕI)
- Cào: mỗi nguồn không cào lại bài đã cào (URL gốc + hash).
- Tạo reel: mỗi page không tạo lại reel từ bài đã dùng cho chính page đó; bài đó vẫn dùng được cho page khác.
- Đăng: mỗi page không đăng lại reel đã đăng.

---

## 11. KIẾN TRÚC CHẠY NỀN

### 11.1. Hàng đợi BullMQ (tách riêng)
- `crawl-queue` — cào bài + đẩy WordPress.
- `ai-queue` — tạo caption + voice.
- `video-queue` — render FFmpeg (concurrency giới hạn).
- `publish-queue` — đăng lên Facebook.

### 11.2. Cron định kỳ
- Cào theo lịch từng nguồn.
- Sinh job tạo reel theo tần suất từng page (lấy bài chưa dùng).
- Quét reel tới giờ đăng (mỗi phút).
- Kiểm tra sức khỏe token (mỗi ngày).
- Thu thập thống kê (mỗi ngày).

### 11.3. Tách Backend API và Workers
- API Server chỉ nhận request + đẩy job vào hàng đợi, trả lời ngay.
- Workers (tiến trình riêng) rút job xử lý việc nặng.

---

## 12. CẤU TRÚC DỮ LIỆU (BẢNG CHÍNH)


/** Người dùng & quyền */ users(id, email, password_hash, role, created_at) user_assets(user_id, asset_type[site|page], asset_id)

/** Facebook */ fb_accounts(id, fb_user_id, name, user_token_encrypted, status, owner_user_id) pages(id, fb_page_id, name, avatar, category, follower_count, page_token_encrypted, fb_account_id, default_reel_template_id, token_status, last_checked)

/** Phần 1 — website đích + nguồn cào */ target_sites(id, wp_url, wp_username, wp_app_password_encrypted, status, owner_user_id) crawl_sources(id, target_site_id, source_url, source_category, extract_rules_json, frequency_cron, enabled) crawl_history(id, crawl_source_id, source_post_url, content_hash, wp_post_id, status, error, crawled_at)

/** Phần 2 — tạo reel / page_reel_configs(id, page_id, target_site_id, wp_category_id, frequency_cron, reel_template_id, caption_style_json, enabled) reel_templates(id, type[image|reel], name, config_json, created_by) reels(id, page_id, wp_post_id, video_path, caption, voice_path, status, created_at) reel_history(id, page_id, wp_post_id, reel_id, created_at) /* loại trừ theo page */

/** Phần 3 — đăng */ page_publish_configs(id, page_id, frequency_cron, time_windows_json, enabled) publish_history(id, page_id, reel_id, fb_post_id, status, error, retry_count, published_at)

/** Thống kê */ page_stats(id, page_id, date, followers, reach, engagement) post_stats(id, reel_id, page_id, views, likes, comments, shares, collected_at)

/** Chung */ media(id, type, path, meta_json, created_by, created_at) activity_logs(id, user_id, action, detail_json, created_at) jobs_log(id, job_type, ref_id, status, error, retry_count, created_at) settings(key, value_encrypted) ai_usage_logs(id, provider, tokens, cost, ref_id, created_at)


---

## 13. YÊU CẦU PHI CHỨC NĂNG
- Bảo mật: mã hóa token/mật khẩu/API key, JWT, validate đầu vào, rate limit API nội bộ.
- Hiệu năng: tác vụ nặng chạy nền, giới hạn concurrency render video.
- Mở rộng: adapter AI dạng khe cắm, dễ thêm model/nhà cung cấp mới.
- Responsive: giao diện React responsive (Tailwind).
- Docker hóa môi trường dev; sẵn sàng deploy VPS cho prod.
- Log đầy đủ phục vụ debug.

---

## 14. LỘ TRÌNH TRIỂN KHAI (theo phụ thuộc — làm tuần tự)
- **Giai đoạn 1 (MVP):** Module A (auth) + B (token) + C (quản lý page) + F3/F2 đăng reel/ảnh thủ công. Mục tiêu: đăng được reel lên nhiều page từ hệ thống.
- **Giai đoạn 2:** Phần 1 (D1–D4 cào + đẩy WordPress).
- **Giai đoạn 3:** Phần 2 (E1–E5 AI + template + tạo reel — phần khó/tốn nhất).
- **Giai đoạn 4:** Phần 3 đầy đủ (F1 tự động theo tần suất) + Module G (thống kê).
- **Giai đoạn 5:** Module H (vận hành/log/thông báo) + phân quyền chi tiết + thống kê nâng cao.

---

## 15. LƯU Ý KỸ THUẬT QUAN TRỌNG (cho AI code)
- **Facebook token:** BẮT BUỘC gia hạn user token sang long-lived TRƯỚC khi gọi `/me/accounts` lấy page token; nếu lấy page token từ token ngắn hạn thì page token cũng hết hạn theo. Đối chiếu doc developers.facebook.com.
- **Reel Facebook:** đúng 3 phase và phải poll status tới PUBLISHED, không coi `finish` là xong.
- **FFmpeg:** xuất đúng 9:16, ảnh ngang phải xử lý nền blur; giới hạn concurrency.
- **WordPress:** dùng Application Password (Basic Auth header), endpoint `/wp-json/wp/v2/posts`, `/media`, `/categories`.
- **Extract rules cào:** cấu hình selector, không hardcode theo 1 website.
- Yêu cầu viết test cho Module B (token) và Phần 3 (đăng) — hai chỗ dễ hỏng ngầm.