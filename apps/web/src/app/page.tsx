import Link from 'next/link';
import { ArrowRight, Box, FileCheck2, MessageSquareText, type LucideIcon } from 'lucide-react';
import { Leaves } from '@/components/ui';
import { PostCard } from '@/features/blog/PostCard';
import { POSTS } from '@/features/blog/posts';
import { PublicFooter } from '@/features/blog/PublicFooter';
import { PublicHeader } from '@/features/blog/PublicHeader';

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Box,
    title: 'Phòng tham vấn 3D',
    text: 'Thân chủ ngồi đối diện bạn, đổi tư thế theo cảm xúc. Máy yếu chuyển sang 2D bất cứ lúc nào.',
  },
  {
    icon: MessageSquareText,
    title: 'Nói hoặc gõ phím',
    text: 'Bạn trò chuyện bằng giọng nói hoặc văn bản, thân chủ trả lời bằng chữ trên màn hình.',
  },
  {
    icon: FileCheck2,
    title: 'Phản hồi có dẫn chứng',
    text: 'Báo cáo sáu nhóm kỹ năng, mỗi nhận xét dẫn về đúng câu bạn đã nói.',
  },
];

/** Trang chủ công khai dạng tin tức, ai cũng xem được khi chưa đăng nhập */
export default function Home() {
  const [featured, ...rest] = POSTS;
  return (
    <div className="pub">
      <Leaves />
      <PublicHeader />
      <main className="pub-main">
        <section className="pub-hero" aria-labelledby="hero-title">
          <span className="eyebrow">Góc chia sẻ của Lab FourT</span>
          <h1 id="hero-title">Học tham vấn bằng cách thực hành, mỗi ngày một chút</h1>
          <p>
            Bài viết ngắn về kỹ năng tham vấn, đạo đức nghề và cách tận dụng phòng thực hành ảo cho sinh viên và giảng
            viên.
          </p>
        </section>

        <section id="bai-viet" className="pub-posts" aria-labelledby="posts-title">
          <h2 id="posts-title" className="sr-only">
            Bài viết
          </h2>
          {featured && <PostCard post={featured} featured />}
          <div className="post-grid">
            {rest.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>

        <section id="gioi-thieu" className="pub-about" aria-labelledby="about-title">
          <div className="pub-about-text">
            <span className="eyebrow">Về Lab FourT</span>
            <h2 id="about-title">Một căn phòng để luyện lắng nghe</h2>
            <p>
              Lab FourT là phòng thực hành tham vấn ảo trên trình duyệt. Sinh viên trò chuyện với thân chủ mô phỏng, xem
              lại từng lượt trao đổi và nhận phản hồi có dẫn chứng. Giảng viên soạn ca, giao bài và theo dõi tiến bộ của
              lớp.
            </p>
            <Link href="/tin-tuc/gioi-thieu-lab-fourt" className="btn secondary">
              Tìm hiểu thêm
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <ul className="pub-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="ico">
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
