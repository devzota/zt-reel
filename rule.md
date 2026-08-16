## User Rules
1. Code làm sao để không ảnh hưởng tới dữ liệu 2 nơi (local và VPS), luôn đảm bảo dữ liệu an toàn, bảo mật.
2. Trong quá trình test/fix tạo file rác xong PHẢI XÓA ĐI, mã nguồn phải luôn sạch kể cả code.
3. Luôn comment đúng quy định (dùng /** */ hoặc <!-- -->).
4. CHỈ ĐƯỢC PHÉP commit lên git và deploy lên VPS khi có lệnh CỤ THỂ từ người dùng (sau khi check local OK). Không được tự ý deploy.
5. Khi nhắc tới lỗi trên VPS, CHỈ dùng lệnh để kiểm tra/khám bệnh trên VPS hiện tại, KHÔNG tự ý sửa file ở local. Phải xác nhận chính xác nguyên nhân dựa trên log/chứng cứ rồi mới tiến hành xử lý.