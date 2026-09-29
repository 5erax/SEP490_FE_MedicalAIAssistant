// Explain UI concepts without introducing billing rules or clinical conclusions.
export const TERM_GUIDES = {
  lab: {
    title: "Hiểu các thuật ngữ trong kết quả xét nghiệm",
    terms: [
      ["Khoảng tham chiếu", "Khoảng giá trị dùng để đối chiếu chỉ số xét nghiệm. Kết quả ngoài khoảng này chưa đủ để kết luận có bệnh; cần xem cùng các thông tin sức khỏe khác."],
      ["Bình thường và cần chú ý", "Đây là các nhóm kết quả để bạn dễ xem và trao đổi với bác sĩ. Chỉ số trong khoảng tham chiếu không đồng nghĩa với kết luận sức khỏe hoàn toàn bình thường."],
      ["Chưa xác định", "Chỉ số chưa đủ dữ liệu để đối chiếu, không được xem là chỉ số bình thường."],
      ["Xu hướng", "Cho biết sự thay đổi giữa các lần xét nghiệm theo dữ liệu hiện có. Tiến gần khoảng tham chiếu không tự động có nghĩa là đã khỏi bệnh."],
    ],
  },
  clinical: {
    title: "Hiểu nhận định và mã ICD-10",
    terms: [
      ["Nhận định tham khảo", "Gợi ý dựa trên thông tin bạn cung cấp để hỗ trợ trao đổi với bác sĩ, không phải chẩn đoán đã được xác nhận."],
      ["ICD-10", "Hệ thống mã phân loại bệnh dùng để thống nhất cách ghi nhận thông tin. Việc hiển thị mã không có nghĩa bạn đã được xác nhận mắc bệnh đó."],
      ["Chuyên khoa đề xuất", "Gợi ý nơi có chuyên môn phù hợp để bạn thăm khám. Cơ sở y tế sẽ xác nhận chuyên khoa sau khi đánh giá trực tiếp."],
    ],
  },
  credit: {
    title: "Lượt dịch vụ được hiểu như thế nào?",
    terms: [
      ["Lượt dịch vụ dùng chung", "Lượt dùng cho phân tích xét nghiệm, tư vấn trước khám và kế hoạch phục hồi. Xem quyền lợi của từng gói trước khi mua."],
      ["Lượt đang xử lý", "Lượt đang được giữ cho yêu cầu chưa hoàn tất. Hãy phân biệt số này với số lượt còn có thể sử dụng."],
      ["Lượt tặng thêm", "Lượt dịch vụ được tặng ngoài quyền lợi của gói khi áp dụng ưu đãi."],
      ["Suất ưu đãi", "Giới hạn sử dụng một chương trình ưu đãi, khác với số lượt dịch vụ bạn nhận được."],
    ],
  },
  redemption: {
    title: "Hiểu suất ưu đãi và lượt được cấp",
    terms: [
      ["Đang giữ suất", "Suất đang được giữ cho giao dịch, chưa phải lượt sử dụng ưu đãi đã hoàn tất."],
      ["Đã sử dụng / Đã giải phóng", "Phân biệt suất đã được sử dụng với suất không còn được giữ cho giao dịch. Đây là trạng thái của suất ưu đãi, không phải số dư lượt dịch vụ."],
      ["Lượt dịch vụ được cấp", "Bảng trình bày lượt của gói + lượt tặng thêm = tổng lượt được cấp."],
    ],
  },
  revenue: {
    title: "Hiểu các chỉ số doanh thu ưu đãi",
    terms: [
      ["Giai đoạn trước, trong và sau chương trình", "Các khoảng thời gian dùng để so sánh doanh thu. Xem ngày bắt đầu và kết thúc hiển thị bên dưới; giai đoạn chưa đủ dữ liệu sẽ có lưu ý riêng."],
      ["Doanh thu chương trình", "Doanh thu từ giao dịch áp dụng chương trình, kể cả giao dịch thanh toán sau khi chương trình kết thúc. Khác với doanh thu toàn hệ thống trong cùng thời gian."],
      ["Thay đổi doanh thu", "Mức chênh lệch giữa các giai đoạn so sánh, không khẳng định doanh thu thay đổi là do chương trình ưu đãi."],
    ],
  },
  feedback: {
    title: "Hiểu thống kê phản hồi",
    terms: [
      ["Điểm trung bình", "Mức đánh giá tổng hợp từ những phản hồi đã được gửi. Cần đọc cùng số phản hồi để hiểu phạm vi của số liệu."],
      ["Tỷ lệ phản hồi", "Chỉ số về mức độ có phản hồi trong thống kê kế hoạch, không phải tỷ lệ khỏi bệnh hay tỷ lệ điều trị thành công."],
    ],
  },
};
