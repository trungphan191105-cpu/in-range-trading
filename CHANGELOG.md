# Bảng Ghi nhận Cập nhật Hệ thống (Update Log)

Dưới đây là danh sách chi tiết toàn bộ các tính năng mới, nâng cấp bảo mật và tối ưu hóa giao diện đã được triển khai cho dự án **In-Range Trading (Trading Academy)**.

---

## 📅 Phiên bản Cập nhật Mới Nhất (Tháng 6/2026)

### 1. 🛡️ Chuẩn hóa Bảo mật & Kiểm tra Dữ liệu (Backend)
- **Thư viện Zod & Types:** Cài đặt bổ sung `zod` và `@types/node@24` vào `backend/package.json` nhằm cung cấp cơ chế kiểm tra kiểu dữ liệu tĩnh và động chính xác nhất.
- **Middleware Xác thực (Validate Middleware):** Xây dựng mới `backend/src/middleware/validate.ts` chứa hàm `validateRequest` và các schema kiểm tra toàn vẹn dữ liệu cho:
  - `loginSchema`, `registerSchema` (Authentication)
  - `createTradePlanSchema`, `updateTradePlanSchema` (Trade Plans)
  - `createJournalSchema`, `updateJournalSchema` (Journals)
  - `createAccountSchema`, `updateAccountSchema` (Accounts)
- **Bảo vệ Routes:** Tích hợp trực tiếp middleware kiểm tra vào các route xử lý logic API (`auth.ts`, `tradePlans.ts`, `journals.ts`, `accounts.ts`), ngăn chặn dữ liệu bẩn và tấn công injection từ gốc.

### 2. 🗄️ Hệ thống Quản lý Database Migration
- **Khởi tạo Bảng Migrations:** Nâng cấp `backend/src/db/schema.ts` để tự động tạo bảng theo dõi lịch sử cập nhật cấu trúc DB (`migrations`).
- **Thực thi Migration Tự động:** Gỡ bỏ giải pháp `safeAlter` cũ, áp dụng quy trình kiểm tra danh sách migration chưa chạy và thực thi tự động (ví dụ: thêm cột `grade`, `feedback` cho `trade_plans`), đảm bảo tính nhất quán và dễ dàng mở rộng cấu trúc dữ liệu sau này.

### 3. ⚡ Thông báo Real-time với Server-Sent Events (SSE)
- **Quản lý Kết nối SSE:** Bổ sung router mới `backend/src/routes/notifications.ts` quản lý bộ đệm kết nối theo `userId` và cung cấp cơ chế truyền sự kiện mượt mà qua hàm `sendNotification`. Đăng ký vào hệ thống tại `index.ts`.
- **Hỗ trợ Token qua Query String:** Cập nhật middleware xác thực `verifyToken` (`backend/src/middleware/auth.ts`) cho phép nhận token từ tham số `req.query.token`, khắc phục hạn chế không hỗ trợ custom header của đối tượng `EventSource` trên trình duyệt.
- **Phát sự kiện chấm điểm:** Tự động gửi tín hiệu real-time `plan_graded` từ backend tới học viên ngay khi Giảng viên / Admin hoàn tất chấm điểm kế hoạch giao dịch (`PUT /api/trade-plans/:id`).
- **Lắng nghe và Hiển thị trên Frontend:** Bổ sung `useEffect` bên trong `AuthGate` (`frontend/src/App.tsx`) để tự động mở luồng lắng nghe `EventSource`. Ngay khi nhận được thông báo, hệ thống lập tức hiển thị thông báo trực quan qua `toast.success` và gọi `qc.invalidateQueries()` để cập nhật dữ liệu hiển thị mới nhất mà không cần tải lại trang.

### 4. 🎨 Tối ưu hóa Giao diện & Đồ họa Vật lý (Frontend)
- **Bảo đảm Không Gian Hoạt Động (MindMap Fixes):**
  - Tích hợp giới hạn biên an toàn (`minX`, `maxX`, `minY`, `maxY`) trực tiếp vào vòng lặp đồ họa `tick()` trong `frontend/src/pages/student/MindMap.tsx`. Các nút kéo thả và nhãn tên giữ khoảng cách ít nhất 100px so với mép trên, loại bỏ hoàn toàn hiện tượng trôi mất chữ vào Navbar hoặc mép trình duyệt.
  - Gỡ bỏ lực kéo tâm `HUB_ANCHOR` mặc định, cho phép kéo và đặt các nút (nodes) tự do ở mọi tọa độ trên màn hình mà không bị kẹt trong vùng ô vuông cố định.
  - Sửa cơ chế click chuột vào nền trống: Khi bấm giữ chuột trên nền, nút trung tâm (Hub) lập tức dịch chuyển chính xác đến vị trí con trỏ chuột thay vì trôi (pan) toàn bộ không gian canvas.
- **Tối ưu Hiển thị Thanh Trạng Thái & Nút Theme:**
  - Điều chỉnh `.nav-tooltip` trong `frontend/src/index.css` (đổi thành `top: calc(100% + 10px)`), đưa toàn bộ nhãn giải thích hiển thị ngay bên dưới icon Navbar một cách đẹp mắt.
  - Tinh chỉnh màu chữ và nền của cụm nút chọn Theme ở góc dưới phải: các nút không được chọn luôn hiển thị màu chữ trắng sáng (`#ededf3`) trên nền box tối, và nút Mono khi kích hoạt sẽ chuyển sang nền trắng chữ đen nổi bật, loại bỏ triệt để lỗi màu chữ bị chìm/hòa vào nền.
- **Khắc phục các lỗi Strict TypeScript:** Xử lý triệt để các cảnh báo kiểm tra kiểu dữ liệu trong tsconfig và các component của code cũ, đưa toàn bộ frontend đạt trạng thái build thành công hoàn hảo 100%.

---
*Báo cáo được khởi tạo tự động nhằm lưu trữ và theo dõi tiến trình phát triển hệ thống.*
