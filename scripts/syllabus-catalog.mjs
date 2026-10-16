// Explicit publication list: never discover files recursively in the study repo.
export const coursePath = "/syllabus/linear-algebra";
export const courseSource = "syllabus/mon-02-dai-so-tuyen-tinh";
export const lessons = [
  ["bai-01-vector-tich-vo-huong.md", "vectors-and-dot-products", "Vector, tích vô hướng và phép chiếu", "Từ mũi tên, độ dài và bóng chiếu đến dot product và cosine similarity."],
  ["bai-02-ma-tran-la-phep-bien-doi.md", "linear-transformations", "Ma trận là phép biến đổi", "Nhìn không gian bị quay, kéo, trượt để hiểu phép nhân ma trận."],
  ["bai-03-span-doc-lap-hang.md", "span-and-rank", "Span, độc lập tuyến tính và hạng", "Những hướng đi độc lập tạo nên không gian; hạng đếm số hướng còn giữ lại."],
  ["bai-04-dinh-thuc-nghich-dao.md", "determinants-and-inverses", "Định thức và ma trận nghịch đảo", "Diện tích thay đổi ra sao, và khi nào có thể đảo ngược một phép biến đổi?"],
  ["bai-05-ma-tran-khong-vuong-embedding.md", "rectangular-matrices-and-embeddings", "Ma trận không vuông và embedding", "Nén và nâng chiều, bình phương tối thiểu, giả nghịch đảo, rồi embedding như một bảng tra."],
  ["bai-06-doi-co-so.md", "change-of-basis", "Đổi cơ sở", "Cùng một vector, hai cách ghi toạ độ. Thay hệ trục để thấy cấu trúc."],
  ["bai-07-eigenvector.md", "eigenvectors-and-eigenvalues", "Eigenvector và eigenvalue", "Tìm những trục không đổi hướng khi không gian bị biến đổi."],
  ["bai-08-markov-pagerank.md", "markov-chains-and-pagerank", "Ma trận Markov và PageRank", "Theo dòng xác suất trên đồ thị để hiểu phân phối dừng và PageRank."],
  ["bai-09-svd-hang-thap.md", "singular-value-decomposition", "SVD và xấp xỉ hạng thấp", "Tách phép biến đổi thành các hướng chính; giữ lại phần thông tin quan trọng."],
  ["bai-10-laplacian-do-thi.md", "graph-laplacians", "Laplacian đồ thị", "L = D − A đo chênh lệch giữa các đỉnh kề nhau; trị riêng đếm số mảnh và cắt đồ thị."],
].map(([file, slug, title, description], index) => ({
  file, slug, title, description, number: index + 1,
  // Publish only PDFs explicitly approved in the initial release.
  pdfFile: index < 3 ? `mon-02-bai-0${index + 1}-ghi-tay.pdf` : null,
}));
