'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Hộp thoại xác nhận, cùng giao diện với prototype. Esc hoặc bấm ra ngoài để đóng. */
export const Modal = ({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Đưa tiêu điểm vào hộp thoại để người dùng bàn phím và trình đọc màn hình biết hộp thoại đã mở
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="modal-back"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" ref={ref} tabIndex={-1}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="body">{children}</div>
        <footer>{footer}</footer>
      </div>
    </div>
  );
};
