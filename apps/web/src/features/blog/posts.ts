/**
 * Bài viết của trang tin tức công khai. Nội dung tĩnh, nằm trong mã giao diện.
 * Bài mang tính giới thiệu, không thay thế giáo trình. Nội dung chuyên môn cần giảng viên rà soát (OI-02).
 */

export type FigureKey = 'listening-loop' | 'questions';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'dialog'; lines: { who: 'counselor' | 'client'; text: string }[]; note?: string }
  | { type: 'figure'; figure: FigureKey; caption: string }
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'callout'; tone: 'info' | 'warn'; title: string; text: string };

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  /** Ngày đăng, dạng ISO */
  date: string;
  readMinutes: number;
  cover: string;
  coverAlt: string;
  /** Vị trí lấy nét của ảnh bìa khi bị cắt */
  coverFocus?: string;
  body: Block[];
}

export const POSTS: Post[] = [
  {
    slug: 'gioi-thieu-lab-fourt',
    title: 'Lab FourT: phòng thực hành tham vấn ảo cho sinh viên',
    excerpt:
      'Một căn phòng 3D yên tĩnh, một thân chủ mô phỏng sẵn sàng trò chuyện và một bản phản hồi có dẫn chứng sau mỗi buổi. Đây là cách Lab FourT giúp sinh viên luyện kỹ năng tham vấn trước khi gặp thân chủ thật.',
    category: 'Giới thiệu',
    date: '2026-11-12',
    readMinutes: 4,
    cover: '/3d/room-plate.webp',
    coverAlt: 'Phòng tham vấn 3D với ghế sofa, đèn đứng, kệ sách và cửa sổ nhìn ra vườn',
    coverFocus: 'center 62%',
    body: [
      {
        type: 'p',
        text: 'Kỹ năng tham vấn chỉ thực sự hình thành khi được luyện tập. Đọc về lắng nghe tích cực là một chuyện, ngồi trước một người đang lo lắng và tìm đúng câu để nói lại là chuyện khác. Thế nhưng sinh viên hiếm khi có đủ cơ hội thực hành trước khi bước vào kỳ thực tập.',
      },
      {
        type: 'p',
        text: 'Lab FourT ra đời để lấp khoảng trống đó: một phòng thực hành trên trình duyệt, nơi sinh viên trò chuyện với thân chủ do AI đóng vai, thử sai không sợ ảnh hưởng tới ai, rồi xem lại từng lượt trao đổi để rút kinh nghiệm.',
      },
      { type: 'h2', text: 'Một buổi thực hành diễn ra thế nào' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Chọn ca trong thư viện, hoặc làm ca giảng viên giao. Mỗi ca có bối cảnh, mục tiêu học tập và vai trò của bạn.',
          'Đọc trang chuẩn bị và xác nhận quy tắc mô phỏng.',
          'Bước vào phòng tham vấn 3D. Bạn nói qua micro hoặc gõ phím; thân chủ trả lời bằng chữ trên màn hình và thay đổi tư thế theo cảm xúc.',
          'Kết thúc phiên, xem lại toàn bộ hội thoại và báo cáo kỹ năng.',
          'Trả lời vài câu hỏi phản tư để tự nhìn lại buổi thực hành.',
        ],
      },
      {
        type: 'image',
        src: '/rooms/room-a-neutral.jpg',
        alt: 'Thân chủ mô phỏng ngồi trên ghế sofa trong phòng tham vấn',
        caption:
          'Thân chủ ngồi đối diện bạn trong phòng tham vấn. Máy yếu có thể chuyển sang chế độ 2D bất cứ lúc nào.',
      },
      { type: 'h2', text: 'Phản hồi có dẫn chứng, không chỉ là con số' },
      {
        type: 'p',
        text: 'Sau mỗi phiên, hệ thống đánh giá sáu nhóm kỹ năng: lắng nghe chủ động, câu hỏi mở, thấu cảm, tóm tắt, tôn trọng quyền tự quyết và đạo đức an toàn. Mỗi nhận xét đều gắn với câu bạn đã thực sự nói. Bấm vào dẫn chứng là tới đúng lượt đó trong transcript. Nhận xét nào không tìm được dẫn chứng sẽ được đánh dấu để bạn và giảng viên xem lại.',
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Điểm để tự đánh giá',
        text: 'Mức kỹ năng do AI đề xuất giúp bạn tự nhìn lại và giúp giảng viên nắm năng lực của lớp. Đây không phải điểm học phần.',
      },
      { type: 'h2', text: 'Dành cho giảng viên' },
      {
        type: 'p',
        text: 'Giảng viên soạn ca theo tám thành phần, giao bài cho lớp hoặc từng sinh viên, đọc bài nộp và để lại nhận xét riêng bên cạnh đánh giá của AI. Thống kê kỹ năng của lớp giúp nhận ra kỹ năng nào cả lớp còn yếu để điều chỉnh bài giảng.',
      },
      { type: 'h2', text: 'Dữ liệu của bạn' },
      {
        type: 'p',
        text: 'Hệ thống chạy trên máy chủ của đơn vị. Lời nói được chuyển thành văn bản và không lưu âm thanh. Bạn xem và tự xóa được phiên thực hành của mình trong 14 ngày. Giảng viên chỉ đọc được bài bạn nộp, không đọc được các phiên luyện tự do.',
      },
    ],
  },
  {
    slug: 'lang-nghe-tich-cuc',
    title: 'Lắng nghe tích cực: năm việc nhỏ làm nên buổi gặp đầu tiên',
    excerpt:
      'Lắng nghe không phải là im lặng chờ đến lượt mình nói. Năm kỹ thuật dưới đây giúp thân chủ cảm thấy được hiểu, và giúp bạn hiểu thân chủ đúng hơn.',
    category: 'Kỹ năng',
    date: '2026-11-10',
    readMinutes: 5,
    cover: '/rooms/room-a-relieved.jpg',
    coverAlt: 'Thân chủ ngồi thư thái trên ghế sofa, nét mặt nhẹ nhõm',
    coverFocus: 'center 40%',
    body: [
      {
        type: 'p',
        text: 'Trong buổi gặp đầu tiên, thân chủ thường chưa biết có nên tin bạn hay không. Điều quyết định không nằm ở câu hỏi hay nhất bạn chuẩn bị, mà ở việc họ có cảm thấy được lắng nghe hay không. Lắng nghe tích cực là một chuỗi hành vi cụ thể, luyện được và quan sát được.',
      },
      {
        type: 'figure',
        figure: 'listening-loop',
        caption:
          'Vòng lắng nghe: chú ý, phản ánh, làm rõ rồi tóm tắt, sau đó quay lại chú ý với những gì thân chủ vừa bổ sung.',
      },
      { type: 'h2', text: '1. Chú ý bằng cả sự hiện diện' },
      {
        type: 'p',
        text: 'Ánh mắt, tư thế hơi hướng về phía thân chủ, những âm đệm ngắn như "ừm", "mình đang nghe". Trong phòng thực hành, bạn không có cơ thể thật, nên sự chú ý thể hiện qua nhịp trả lời: không vội chen ngang, không chuyển đề tài khi thân chủ chưa nói xong.',
      },
      { type: 'h2', text: '2. Phản ánh nội dung' },
      {
        type: 'p',
        text: 'Nói lại ý chính bằng lời của bạn, ngắn gọn. Mục đích không phải lặp lại như cái máy, mà để thân chủ biết bạn đã hiểu đúng, hoặc có cơ hội sửa lại nếu bạn hiểu sai.',
      },
      { type: 'h2', text: '3. Phản ánh cảm xúc' },
      {
        type: 'p',
        text: 'Gọi tên cảm xúc bạn nhận thấy, kèm điều đã khiến bạn nhận ra nó. Đây thường là lúc thân chủ bắt đầu mở lòng hơn.',
      },
      {
        type: 'dialog',
        lines: [
          { who: 'client', text: 'Kỳ này em trượt hai môn, em chưa dám nói với bố mẹ.' },
          {
            who: 'counselor',
            text: 'Nghe em kể, mình cảm nhận em đang rất lo, nhất là khi nghĩ tới phản ứng của bố mẹ.',
          },
          { who: 'client', text: 'Dạ... em sợ bố mẹ thất vọng. Nhà em chỉ có mình em học đại học.' },
        ],
        note: 'Phản hồi cảm xúc kèm lý do giúp thân chủ nói tiếp điều quan trọng hơn.',
      },
      { type: 'h2', text: '4. Để khoảng lặng làm việc' },
      {
        type: 'p',
        text: 'Người mới tập tham vấn thường sợ im lặng và vội lấp đầy bằng câu hỏi tiếp theo. Một khoảng lặng ngắn sau câu nói nặng nề cho thân chủ thời gian cảm nhận và quyết định có nói thêm hay không.',
      },
      { type: 'h2', text: '5. Tóm tắt trước khi chuyển hướng' },
      {
        type: 'p',
        text: 'Trước khi chuyển sang chủ đề khác hoặc kết thúc buổi, hãy tóm tắt những gì đã nghe và hỏi lại xem bạn có bỏ sót điều gì không. Tóm tắt giúp cả hai cùng nhìn thấy bức tranh chung.',
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Thử ngay trong phòng thực hành',
        text: 'Chọn ca Áp lực học tập và đặt mục tiêu cho riêng mình: ít nhất ba lần phản ánh cảm xúc trước khi đặt câu hỏi đầu tiên về giải pháp. Sau phiên, xem báo cáo kỹ năng Thấu cảm để biết mình đã làm được bao nhiêu.',
      },
    ],
  },
  {
    slug: 'cau-hoi-mo-va-cau-hoi-dong',
    title: 'Câu hỏi mở hay câu hỏi đóng: chọn thế nào cho đúng lúc',
    excerpt:
      'Câu hỏi mở mời thân chủ kể, câu hỏi đóng giúp bạn xác nhận. Cả hai đều cần, vấn đề là dùng câu nào vào lúc nào.',
    category: 'Kỹ năng',
    date: '2026-11-06',
    readMinutes: 4,
    cover: '/rooms/room-c-neutral.jpg',
    coverAlt: 'Thân chủ ngồi trên ghế sofa, hai tay đặt trên gối, đang lắng nghe',
    coverFocus: 'center 38%',
    body: [
      {
        type: 'p',
        text: 'Một buổi tham vấn có thể biến thành buổi thẩm vấn chỉ vì người tham vấn hỏi quá nhiều câu đóng liên tiếp. Thân chủ trả lời "có", "không", rồi chờ câu tiếp theo, và bạn cũng chẳng hiểu thêm được bao nhiêu về họ.',
      },
      {
        type: 'figure',
        figure: 'questions',
        caption: 'Câu hỏi đóng thu hẹp câu trả lời; câu hỏi mở mở rộng không gian để thân chủ tự kể.',
      },
      { type: 'h2', text: 'Khi nào dùng câu hỏi mở' },
      {
        type: 'list',
        items: [
          'Mở đầu buổi gặp: "Hôm nay điều gì khiến em muốn tới đây?"',
          'Khi muốn hiểu trải nghiệm: "Em có thể kể thêm về lúc đó không?"',
          'Khi muốn thân chủ tự nhìn lại: "Theo em, điều gì đã giúp em vượt qua lần trước?"',
        ],
      },
      { type: 'h2', text: 'Khi nào dùng câu hỏi đóng' },
      {
        type: 'list',
        items: [
          'Xác nhận thông tin: "Em đang là sinh viên năm hai, đúng không?"',
          'Kiểm tra lại cách hiểu của mình: "Mình hiểu là em lo nhất về chuyện gia đình, có đúng không?"',
          'Khi cần hỏi trực tiếp về sự an toàn của thân chủ. Lúc đó câu hỏi rõ ràng quan trọng hơn câu hỏi khéo.',
        ],
      },
      { type: 'h2', text: 'Ba lỗi hay gặp' },
      {
        type: 'list',
        items: [
          'Hỏi dồn nhiều câu một lúc khiến thân chủ không biết trả lời câu nào. Mỗi lượt chỉ nên có một câu hỏi.',
          'Hỏi "tại sao" liên tục dễ khiến thân chủ thấy bị phán xét. Thử đổi thành "điều gì đã khiến…" hoặc "em có thể kể thêm về…".',
          'Câu hỏi dẫn dắt như "Chắc em buồn lắm phải không?" đặt sẵn câu trả lời vào miệng thân chủ. Hãy để họ tự gọi tên cảm xúc.',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Xem lại trong báo cáo',
        text: 'Báo cáo sau phiên có riêng kỹ năng Câu hỏi mở và làm rõ, kèm những câu bạn đã hỏi làm dẫn chứng. Đọc lại transcript và tự đếm: bao nhiêu câu mở, bao nhiêu câu đóng?',
      },
    ],
  },
  {
    slug: 'an-toan-va-dao-duc-khi-thuc-hanh',
    title: 'Thực hành với thân chủ mô phỏng: an toàn và đạo đức',
    excerpt:
      'Thân chủ trong Lab FourT không phải người thật, nhưng thói quen nghề nghiệp bạn hình thành ở đây là thật. Vài nguyên tắc để buổi thực hành vừa an toàn vừa có ích.',
    category: 'Đạo đức nghề',
    date: '2026-11-03',
    readMinutes: 4,
    cover: '/rooms/room-b-neutral.jpg',
    coverAlt: 'Thân chủ nam mặc áo khoác ngồi trên ghế sofa trong phòng tham vấn',
    coverFocus: 'center 35%',
    body: [
      {
        type: 'p',
        text: 'Mọi màn hình trong phòng thực hành đều có nhãn "mô phỏng". Nhãn đó nhắc rằng đây là môi trường học tập: không có thân chủ thật nào chịu ảnh hưởng từ câu nói vụng về của bạn. Nhưng chính vì an toàn nên đây là nơi tốt nhất để tập những thói quen đúng.',
      },
      { type: 'h2', text: 'Đối xử như với thân chủ thật' },
      {
        type: 'p',
        text: 'Hãy chào hỏi, giới thiệu vai trò, tôn trọng quyền tự quyết và không phán xét, đúng như bạn sẽ làm trong buổi tham vấn thật. Thói quen được hình thành qua lặp lại, kể cả khi người ngồi đối diện chỉ là mô phỏng.',
      },
      { type: 'h2', text: 'Bảo mật ngay từ khi tập' },
      {
        type: 'list',
        items: [
          'Không nhập họ tên, số điện thoại hay câu chuyện thật của người khác vào cuộc trò chuyện.',
          'Không chia sẻ transcript của mình ra ngoài nhóm học tập khi chưa được giảng viên đồng ý.',
          'Đăng xuất khi dùng máy chung ở phòng lab và không chọn Ghi nhớ đăng nhập.',
        ],
      },
      { type: 'h2', text: 'Khi thân chủ nói điều đáng lo' },
      {
        type: 'p',
        text: 'Một số ca được thiết kế để thân chủ có tín hiệu nguy cơ. Khi đó hệ thống hiện hướng dẫn an toàn trên màn hình. Hãy tạm dừng việc khám phá vấn đề, hỏi trực tiếp và rõ ràng về sự an toàn của thân chủ, rồi làm theo quy trình giảng viên đã hướng dẫn. Đây là kỹ năng cần luyện nhiều nhất, vì ngoài đời không có ai nhắc bạn.',
      },
      {
        type: 'image',
        src: '/rooms/room-a-hesitant.jpg',
        alt: 'Thân chủ ngồi do dự, hai tay đan vào nhau',
        caption:
          'Nhân vật thay đổi tư thế theo cảm xúc: do dự, lo lắng, buồn hay nhẹ nhõm. Hãy để ý những thay đổi đó.',
      },
      { type: 'h2', text: 'Chăm sóc chính mình' },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Nếu chính bạn đang gặp khó khăn',
        text: 'Có những ca chạm tới trải nghiệm riêng của người thực hành. Nếu thấy nặng nề, bạn có thể dừng phiên bất cứ lúc nào. Hãy nói chuyện với giảng viên, phòng tư vấn của trường hoặc một người bạn tin cậy. Nếu có nguy hiểm tức thời, hãy gọi ngay cấp cứu hoặc tới cơ sở y tế gần nhất.',
      },
      {
        type: 'p',
        text: 'Thực hành với thân chủ mô phỏng không thay thế giám sát lâm sàng hay buổi thực tập có người hướng dẫn. Nó là bước chuẩn bị, để khi gặp thân chủ thật, bạn đã có sẵn những thói quen tốt.',
      },
    ],
  },
];

export const findPost = (slug: string) => POSTS.find((p) => p.slug === slug);

/** Ngày đăng dạng 12 tháng 11, 2026 */
export const formatPostDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} tháng ${m}, ${y}`;
};
