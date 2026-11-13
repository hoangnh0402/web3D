import Link from 'next/link';
import { ROLE_LOGIN } from '@lab-fourt/shared';
import { BrandMark } from '@/components/ui';

/** Chân trang công khai: nhắc đây là môi trường mô phỏng phục vụ học tập */
export const PublicFooter = () => (
  <footer className="pub-foot">
    <div className="pub-foot-in">
      <div className="pub-brand">
        <BrandMark small />
        <span>
          <b>LAB FOURT</b>
          <small>Phòng thực hành tham vấn ảo</small>
        </span>
      </div>
      <p className="small muted">
        Môi trường mô phỏng phục vụ học tập. Thân chủ do AI đóng vai, không phải người thật và không thay thế dịch vụ
        tham vấn. Bài viết mang tính giới thiệu, không thay thế giáo trình.
      </p>
      <nav className="pub-foot-links" aria-label="Đăng nhập">
        <Link href={ROLE_LOGIN.STUDENT}>Sinh viên</Link>
        <Link href={ROLE_LOGIN.LECTURER}>Giảng viên</Link>
        <Link href={ROLE_LOGIN.ADMIN}>Quản trị viên</Link>
      </nav>
    </div>
  </footer>
);
