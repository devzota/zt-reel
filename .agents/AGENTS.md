<RULE[ui_design_system]>
## UI Design System & Styling Rules

1. **Colors**: STRICTLY use default Tailwind CSS colors (slate, gray, emerald, red, blue, amber). DO NOT use custom Material colors or generate custom hex codes in Tailwind config except for primary (#1877f2), secondary (#4b5563), tertiary (#0a7ea4).
2. **Cards (Glass Card)**: Use the .glass-card class defined in index.css (bg-white rounded-2xl shadow-md border border-slate-200/60). DO NOT use heavy gray borders (border-gray-300) to separate card components.
3. **Buttons**: 
   - Text buttons: MUST use rounded-full (pill shape).
   - Icon-only buttons: MUST be perfectly circular (w-10 h-10 rounded-full flex items-center justify-center p-0).
   - Cancel/Secondary buttons: MUST use light red background with red text (bg-red-50 text-red-600 hover:bg-red-100).
4. **Inputs & Selects**: MUST use rounded-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary. (In index.css, input elements globally have outline: none;).
5. **Backgrounds**: Body uses bg-slate-100 to create contrast for the white glass-card elements.
6. **Shadows**: Rely on shadow-sm, shadow-md, and shadow-lg to create depth instead of explicit borders.
</RULE[ui_design_system]>

<RULE[user_global]>
## Nguyên tắc làm việc bắt buộc

1. Đọc code trước khi viết — grep/view function hiện có, không viết mới nếu đã có sẵn
2. Tái sử dụng — ưu tiên sửa function có sẵn thay vì tạo logic trùng
3. Trình bày plan trước khi code — liệt kê file nào, sửa gì, tại sao, chờ xác nhận
4. Mỗi lần gửi code phải kèm hướng dẫn rõ: file nào, tìm dòng nào, thay bằng gì
5. Luôn trình bày kế hoạch (plan), phân tích hoặc báo cáo bằng tính năng Artifact thay vì viết trực tiếp vào khung chat.

## Tiêu chuẩn code

1. Luôn tuân thủ tiêu chuẩn và phương pháp lập trình tốt nhất của WordPress.
2. Chỉ sử dụng class Tailwind CSS, tuyệt đối không dùng file CSS tùy chỉnh hoặc inline style.
3. Tất cả comment trong php, html, js ... phải dùng định dạng /** */, <!-- --> không bao giờ dùng //.
4. Mã nguồn phải sạch, rõ ràng, dễ bảo trì, tuân thủ nguyên tắc phát triển web hiện đại.
5. Luôn ưu tiên hiệu suất và thiết kế responsive.
6. Khi đặt tên hàm, biến, hook hoặc namespace, bắt buộc dùng tiền tố ZTTeam hoặc ztteam_.

## Nguyên tắc triển khai & Dữ liệu
1. Code làm sao để không ảnh hưởng tới dữ liệu 2 nơi (local và VPS), luôn đảm bảo dữ liệu an toàn, bảo mật.
2. Trong quá trình test/fix tạo file rác xong PHẢI XÓA ĐI, mã nguồn phải luôn sạch kể cả code.
3. Luôn comment đúng quy định (dùng /** */ hoặc <!-- -->).
4. CHỈ ĐƯỢC PHÉP commit lên git và deploy lên VPS khi có lệnh CỤ THỂ từ người dùng (sau khi check local OK). Không được tự ý deploy.
</RULE[user_global]>
