Chức năng lấy tài nguyên video từ YouTube Shorts

## Bối cảnh
Dự án cần một chức năng tải video từ YouTube Shorts về server, xuất ra file mp4 chuẩn để các bước xử lý phía sau (render) sử dụng. Đây là spec cho phần LẤY TÀI NGUYÊN, không bao gồm render hay đăng bài.

## Công cụ sử dụng
Dùng thư viện **yt-dlp**.
Repo chính thức: https://github.com/yt-dlp/yt-dlp
Trang release (tải binary): https://github.com/yt-dlp/yt-dlp/releases/latest

KHÔNG dùng videodl (https://github.com/CharlesPikachu/videodl) cho YouTube: nó tải qua API bên thứ ba, chỉ ra ~360p và thường bị chặn 403. videodl chỉ phù hợp cho các nền tảng Trung Quốc (Kuaishou), không dùng ở phần này.

## Nguyên lý hoạt động (để AI hiểu đúng bản chất)
YouTube tách riêng luồng video và luồng audio ở chất lượng cao. yt-dlp sẽ: đọc trang video → lấy danh sách format → tải video stream + audio stream riêng → ghép (merge) lại thành một file mp4 hoàn chỉnh bằng **ffmpeg**.
=> ffmpeg là phụ thuộc BẮT BUỘC. Nếu không có ffmpeg, yt-dlp chỉ tải được bản "progressive" chất lượng thấp.

Link Shorts dạng `https://www.youtube.com/shorts/<ID>` được yt-dlp xử lý trực tiếp, KHÔNG cần chuyển sang dạng `watch?v=<ID>`.

## Yêu cầu bắt buộc khi tải

1. Ép codec H.264 (avc1) cho video + AAC (m4a) cho audio, xuất mp4.
   Format selector:
bv*[vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]/b

Lý do: mặc định yt-dlp hay chọn AV1/VP9 — các codec này gây chậm và dễ lỗi khi render lại bằng ffmpeg, đồng thời kém tương thích với thiết bị/nền tảng cũ.

2. Đặt tên file theo ID video, KHÔNG theo tiêu đề.
Output template:
%(id)s.%(ext)s

Lý do: tiêu đề video chứa emoji, dấu tiếng Việt/Trung, ký tự `#` → gây lỗi đường dẫn và trùng tên.

3. Lấy metadata (id, title, duration, width, height) qua yt-dlp với cờ `--dump-json` (hoặc `--print-json`) để lưu lại phục vụ bước sau.

4. Xác minh file sau khi tải TRƯỚC khi coi là thành công:
- Kiểm tra exit code của tiến trình yt-dlp.
- Dùng **ffprobe** đọc width/height/codec để chắc chắn file hợp lệ.
Lưu ý: yt-dlp có thể in dòng ERROR nhưng vẫn tạo ra file hợp lệ (fallback), hoặc ngược lại. Vì vậy KHÔNG được kết luận thành công chỉ dựa vào log.

## Điều kiện môi trường (VPS: Ubuntu 24.04, x86_64, 4 core, 7.8GB RAM, Python 3.12.3 đã có sẵn)
- Cài yt-dlp bản binary mới nhất từ GitHub release (link ở trên). KHÔNG dùng bản trong apt vì quá cũ, hay lỗi với YouTube.
- ffmpeg / ffprobe phải khả dụng trên server.
- Nên cài thêm JS runtime **deno** (https://github.com/denoland/deno) cho yt-dlp. YouTube đã deprecate việc trích xuất khi không có JS runtime; thiếu nó có thể bị mất format hoặc tải hỏng.

## Bảo trì / vận hành
- yt-dlp phải được CẬP NHẬT ĐỊNH KỲ. YouTube thay đổi cơ chế thường xuyên; bản yt-dlp cũ vài tháng có thể đột ngột tải lỗi hàng loạt.
- Khi tải nhiều video liên tiếp: thêm delay ngẫu nhiên giữa các lần tải và cơ chế retry, để tránh bị YouTube rate-limit hoặc yêu cầu captcha.

## Kết quả mong đợi (tiêu chí nghiệm thu)
Input: 1 link YouTube Shorts.
Output: 1 file mp4 codec H.264/AAC, độ phân giải đầy đủ (ví dụ 1080x1920), tên theo ID video, kèm metadata (title/duration/resolution), đã qua ffprobe xác minh hợp lệ. Link lỗi phải được bắt và báo lỗi rõ ràng, không làm treo tiến trình.