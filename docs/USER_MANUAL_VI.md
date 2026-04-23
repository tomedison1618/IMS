# Hướng Dẫn Sử Dụng IMS Bản Tiếng Việt

## 1. Phạm vi tài liệu

Tài liệu này đi theo đúng nhãn tiếng Việt đang hiển thị trên frontend hiện tại của IMS. Mục tiêu là để người dùng nhìn vào màn hình và đối chiếu trực tiếp với tài liệu, thay vì phải tự quy đổi từ tên tiếng Anh.

Giao diện chính hiện dùng các mục:

- `Tổng quan`
- `Danh mục`
- `Đơn mua hàng`
- `Nhận hàng`
- `Xuất hàng`
- `Kiểm kê`
- `Sản xuất`
- `Người dùng`

## 2. Đăng nhập và thanh bên

Khi mở ứng dụng, màn hình đăng nhập hiển thị các nhãn:

- `Đăng nhập IMS`
- `Email`
- `Mật khẩu`
- `Vai trò yêu cầu`
- `Đăng nhập`

Tài khoản mẫu hiện tại:

- `admin@ims.local` / `Admin123!`
- `finance@ims.local` / `Finance123!`
- `operations@ims.local` / `Ops123!`

Sau khi đăng nhập, thanh bên hiển thị:

- người dùng đang đăng nhập
- vai trò yêu cầu hiện tại
- chọn ngôn ngữ
- nút `Làm mới dữ liệu`
- nút `Đăng xuất`

Vai trò hiển thị trong giao diện tiếng Việt:

- `Quản trị`
- `Tài chính`
- `Vận hành`

## 3. Tóm tắt quyền theo vai trò

### Quản trị

Vai trò `Quản trị` có quyền rộng nhất.

Có thể:

- xem và thao tác toàn bộ nghiệp vụ
- xem dữ liệu tài chính như `Đơn giá`
- duyệt chênh lệch kiểm kê
- quản lý khu vực `Người dùng`

### Tài chính

Vai trò `Tài chính` thiên về giám sát và phê duyệt.

Có thể:

- xem dữ liệu tại `Tổng quan`
- xem dữ liệu ở `Danh mục`
- xem `Đơn mua hàng`, `Nhận hàng`, `Xuất hàng`
- duyệt mục `Phê duyệt chênh lệch` trong `Kiểm kê`
- xem trường `Đơn giá`

Không phải vai trò chính để:

- nhập hàng
- picking
- tạo kiểm kê
- tạo BoM
- tạo lệnh sản xuất

### Vận hành

Vai trò `Vận hành` là vai trò thao tác chính hằng ngày.

Có thể:

- tạo và sửa dữ liệu trong `Danh mục`
- tạo và duyệt `Đơn mua hàng`
- tạo và hạch toán `Phiếu nhập`
- tạo và xử lý `Đơn bán hàng`
- tạo và gửi `Phiếu kiểm`
- tạo BoM, lệnh sản xuất, completion, backflush
- tạo và ký quy trình phế phẩm trong bản hiện tại

## 4. Tổng quan

Mục `Tổng quan` là màn hình điều hành đầu tiên sau khi đăng nhập.

Người dùng sẽ thấy các chỉ số:

- `Đơn mua đang mở`
- `Phiếu nhập`
- `Đơn bán hàng`
- `Chênh lệch`
- `Lệnh sản xuất`
- `Khả dụng bằng 0`

Khu vực tồn kho hiển thị:

- `Tồn kho trực tiếp`
- cột `Vị trí`
- cột `Lô`

Nên dùng màn hình này để:

- xem nhanh tải công việc mua hàng, nhập hàng, bán hàng và sản xuất
- nhận biết tồn kho rủi ro
- kiểm tra dữ liệu sau khi vừa nhập hàng, xuất hàng hoặc backflush

## 5. Danh mục

Mục `Danh mục` là nơi thiết lập dữ liệu nền và kiểm tra chi tiết vật tư.

### 5.1 Tạo mặt hàng

Khối đầu tiên hiển thị:

- `Tạo mặt hàng`
- `Mã hàng nội bộ`
- `Loại mặt hàng`
- `Đơn vị tính`
- `Tồn tối thiểu`
- `SL đặt lại`
- `Thời gian dẫn`
- `Đơn giá`
- nút `Tạo mặt hàng`

Lưu ý:

- `Đơn giá` chỉ phù hợp cho `Quản trị` và `Tài chính`
- `Vận hành` có thể thấy dữ liệu bị giới hạn ở một số trường tài chính

### 5.2 Đối tác

Khối `Đối tác` gồm:

- `Nhà cung cấp`
- `Khách hàng`
- nút `Tạo nhà cung cấp`
- nút `Tạo khách hàng`

Người dùng nhập các trường như mã, tên, email liên hệ, số điện thoại.

### 5.3 Mặt hàng và tồn kho

Khối `Mặt hàng và tồn kho` dùng để tra cứu vật tư đã có.

Các vùng và tab thường gặp:

- `Mặt hàng đang dùng`
- `Mặt hàng lưu trữ`
- `Chọn mặt hàng`
- `Thiết lập mặt hàng`
- tab `Tổng quan`
- tab `Thành phần`
- tab `Giao dịch`
- tab `Lô`
- tab `Sê-ri`
- tab `Chỉnh sửa`

Các nút thường dùng:

- `Làm mới tồn kho`
- `Tạo mã vạch`
- `Sửa mặt hàng`
- `Lưu mặt hàng`
- `Hủy chỉnh sửa`
- `Lưu trữ mặt hàng`
- `Khôi phục mặt hàng`
- `Xóa mặt hàng lưu trữ`

Khi chọn một mặt hàng, người dùng có thể xem:

- số dư theo vị trí, lô, sê-ri
- lịch sử giao dịch
- BoM đang hiệu lực nếu có
- lot tracking và serial tracking

## 6. Đơn mua hàng

Mục `Đơn mua hàng` dùng để tạo chứng từ mua và thêm dòng hàng.

Các nhãn chính trên màn hình:

- `Đơn mua hàng`
- `Ngày nhận dự kiến`
- `Tạo đơn mua`
- `Duyệt đơn mua đã chọn`
- `Thêm dòng đơn mua`
- `Đơn mua gần đây`

Luồng thao tác:

1. Chọn `Nhà cung cấp`.
2. Nhập `Ngày nhận dự kiến`.
3. Bấm `Tạo đơn mua`.
4. Chọn đơn vừa tạo trong bảng `Đơn mua gần đây`.
5. Chọn `Mặt hàng` và số lượng.
6. Bấm `Thêm dòng đơn mua`.
7. Khi đầy đủ, bấm `Duyệt đơn mua đã chọn`.

Không chọn dòng trong bảng thì các thao tác duyệt hoặc thêm ngữ cảnh tiếp theo sẽ không đúng.

## 7. Nhận hàng

Mục `Nhận hàng` là nơi tạo `Phiếu nhập`, thêm dòng nhập và hạch toán tồn kho.

### 7.1 Nhập tay

Các nhãn chính:

- `Nhận hàng`
- `Tạo phiếu nhập`
- `Hạch toán phiếu nhập đã chọn`
- `UUID dòng đơn mua`
- `SL nhận`
- `Ô nhận hàng`
- `Ô cất kho`
- `Lô nhập tay`
- `Thêm dòng phiếu nhập`

Luồng thao tác:

1. Chọn PO làm ngữ cảnh.
2. Bấm `Tạo phiếu nhập`.
3. Chọn phiếu nhập cần thao tác.
4. Nhập `UUID dòng đơn mua`, số lượng, vị trí nhận hàng, vị trí cất kho nếu có.
5. Bấm `Thêm dòng phiếu nhập`.
6. Khi hoàn tất, bấm `Hạch toán phiếu nhập đã chọn`.

### 7.2 Nhận hàng theo quét

Khối riêng trên giao diện:

- `Nhận hàng theo quét`
- `Quét mặt hàng`
- `Quét vị trí`
- `Quét vị trí cất kho`
- `Danh sách sê-ri`
- `Áp dụng dòng nhập đã quét`
- `Ngữ cảnh phiếu nhập`
- `Dòng đơn mua khớp`

Lưu ý:

- nếu chưa chọn phiếu nhập, hệ thống có thể tự tạo phiếu nhập cho PO đang chọn
- khối này phù hợp khi thao tác bằng mã vạch hoặc scanner

### 7.3 Khu vực theo dõi

Người dùng còn có thể xem:

- `Đơn mua gần đây`
- `Phiếu nhập gần đây`

Đây là nơi kiểm tra đơn nào đang mở và phiếu nào đã hạch toán.

## 8. Xuất hàng

Mục `Xuất hàng` dùng để tạo đơn bán, phân bổ và xác nhận picking.

Các nhãn chính:

- `Tạo đơn bán hàng`
- `Mã tham chiếu ngoài`
- `Ngày giao yêu cầu`
- `Tạo đơn bán hàng`
- `Phân bổ`
- `Tạo phiếu lấy hàng`
- `Xác nhận lấy hàng`

### 8.1 Tạo và xử lý đơn bán

Luồng thao tác:

1. Chọn `Khách hàng`.
2. Chọn `Mặt hàng`.
3. Nhập số lượng.
4. Bấm `Tạo đơn bán hàng`.
5. Chọn đơn trong bảng `Đơn bán hàng`.
6. Bấm `Phân bổ`.
7. Bấm `Tạo phiếu lấy hàng`.
8. Bấm `Xác nhận lấy hàng` khi hoàn tất.

### 8.2 Lấy hàng theo quét

Khối trên màn hình:

- `Lấy hàng theo quét`
- `Tải phiếu đang mở`
- `Quét vị trí lấy hàng`
- `Quét mặt hàng lấy`
- `Xác nhận lấy hàng theo quét`
- `Ngữ cảnh lấy hàng`
- `Phiếu lấy hàng hiện tại`
- `Các dòng phiếu đang mở`
- `Dòng phiếu khớp`

Khối này dùng khi muốn quét vị trí và vật tư thay vì xác nhận bằng thao tác tay.

## 9. Kiểm kê

Mục `Kiểm kê` gồm hai phần chính: nhập phiếu kiểm và phê duyệt chênh lệch.

### 9.1 Nhập kiểm kê

Nhãn hiển thị:

- `Nhập kiểm kê`
- `Tạo phiếu kiểm`
- `Gửi phiếu kiểm đã chọn`
- `SL đếm`
- `Thêm dòng kiểm`

Luồng thao tác:

1. Chọn `Vị trí`.
2. Nhập ghi chú nếu cần.
3. Bấm `Tạo phiếu kiểm`.
4. Chọn phiếu trong `Phiếu kiểm gần đây`.
5. Chọn vật tư, nhập `SL đếm`.
6. Bấm `Thêm dòng kiểm`.
7. Bấm `Gửi phiếu kiểm đã chọn`.

### 9.2 Kiểm kê theo quét

Khối riêng:

- `Kiểm kê theo quét`
- `Quét vị trí kiểm kê`
- `Quét mặt hàng kiểm kê`
- `Quét lô`
- `Quét sê-ri`
- `Áp dụng dòng kiểm đã quét`
- `Ngữ cảnh kiểm kê`

Lưu ý:

- nếu chưa chọn phiếu kiểm, hệ thống có thể tự tạo phiếu cho vị trí vừa quét
- vị trí quét phải khớp với vị trí của phiếu kiểm đang chọn

### 9.3 Phê duyệt chênh lệch

Khối dành cho `Tài chính` hoặc `Quản trị`:

- `Phê duyệt chênh lệch`
- `Duyệt phiếu đã chọn`

Người dùng `Vận hành` tạo chênh lệch, còn `Tài chính` hoặc `Quản trị` xử lý phê duyệt.

## 10. Sản xuất

Mục `Sản xuất` hiện có hai hướng thao tác chính:

- `Sản xuất và xuất trừ nguyên liệu`
- khu vực `BoM`

### 10.1 Sản xuất và xuất trừ nguyên liệu

Các nhãn chính:

- `Sản xuất và xuất trừ nguyên liệu`
- `Thành phẩm`
- `SL kế hoạch`
- `Vị trí thành phẩm`
- `SL hoàn thành`
- `Tạo lệnh`
- `Ghi nhận hoàn thành`
- `Xem trước xuất trừ nguyên liệu`
- `Thực hiện xuất trừ nguyên liệu`

Luồng thao tác:

1. Chọn `Thành phẩm`.
2. Chọn BoM nếu cần.
3. Nhập `SL kế hoạch`.
4. Chọn `Vị trí thành phẩm`.
5. Bấm `Tạo lệnh`.
6. Nhập `SL hoàn thành`.
7. Bấm `Ghi nhận hoàn thành`.
8. Bấm `Xem trước xuất trừ nguyên liệu`.
9. Kiểm tra kết quả trong bảng nhu cầu.
10. Nếu đúng, bấm `Thực hiện xuất trừ nguyên liệu`.

### 10.2 Khu vực BoM

Các nhãn đang có trong giao diện:

- `Định mức nguyên vật liệu`
- `Danh sách định mức`
- `Định mức hiện tại`
- `Tạo định mức`
- `Thêm dòng`
- `Kích hoạt`
- `Lưu định mức`
- `Xem trước nhu cầu`
- `Các dòng định mức`
- `Trình sửa dòng`
- `Cập nhật dòng`
- `Xóa dòng`
- `Bỏ chọn dòng`

Mục đích:

- tạo BoM cho thành phẩm
- thêm linh kiện và định lượng
- chỉnh scrap allowance
- xem trước nhu cầu vật tư theo số lượng sản xuất

### 10.3 Phế phẩm

Khối phế phẩm hiển thị:

- `Phế phẩm hai bước ký`
- `Tạo yêu cầu phế phẩm`
- `Sản xuất ký`
- `Kho ký`

Trong bản hiện tại, vai trò `Vận hành` đang thực hiện cả hai bước ký.

## 11. Người dùng

Mục `Người dùng` chỉ phù hợp cho `Quản trị`.

Các khối chính:

- `Danh sách người dùng`
- `Tạo người dùng`
- `Sửa người dùng`

Các trường và nút thường gặp:

- `Email`
- `Tên`
- `Họ`
- `Trạng thái`
- `Vai trò`
- `Mật khẩu`
- `Đặt mật khẩu mới`
- `Tạo người dùng`
- `Lưu người dùng`
- `Bỏ chọn`

Người quản trị có thể:

- tạo tài khoản mới
- gán một hoặc nhiều vai trò
- đổi trạng thái tài khoản
- thay đổi mật khẩu

## 12. Trạng thái thường gặp

Người dùng sẽ gặp các trạng thái như:

- `Nháp`
- `Đang mở`
- `Đã duyệt`
- `Đã hạch toán`
- `Đã phân bổ`
- `Đang lấy hàng`
- `Hoàn thành`
- `Chờ xử lý`
- `Đã xuất trừ`
- `Đã ghi nhận chênh lệch`
- `Từ chối`

## 13. Quy trình thao tác khuyến nghị

Nếu vận hành đầy đủ từ đầu đến cuối, nên đi theo thứ tự đúng với giao diện tiếng Việt:

1. Vào `Danh mục` để tạo nhà cung cấp, khách hàng, vật tư và kiểm tra vị trí.
2. Vào `Đơn mua hàng` để tạo và duyệt PO.
3. Vào `Nhận hàng` để tạo `Phiếu nhập`, thêm dòng và hạch toán.
4. Vào `Tổng quan` để kiểm tra tồn kho sau nhập.
5. Vào `Xuất hàng` để tạo đơn bán, phân bổ và picking.
6. Vào `Kiểm kê` khi cần xác nhận số lượng thực tế.
7. Vào `Sản xuất` khi cần completion, backflush hoặc quản lý BoM.
8. Vào `Người dùng` nếu cần tạo hoặc sửa tài khoản.

## 14. Lưu ý cho bản hiện tại

- giao diện tiếng Việt và tiếng Anh cùng tồn tại, nhưng tài liệu này ưu tiên đúng nhãn tiếng Việt
- một số nghiệp vụ vẫn dùng thuật ngữ kỹ thuật như `BoM`, `UUID`, `backflush`
- các API 3PL vẫn chưa hoàn thiện đầy đủ
- nếu người dùng đổi vai trò mà dữ liệu chưa cập nhật, bấm `Làm mới dữ liệu`

## 15. Tài liệu liên quan

- [README.md](../README.md)
- [USER_MANUAL.md](./USER_MANUAL.md)
- [api-endpoints.md](./api-endpoints.md)
