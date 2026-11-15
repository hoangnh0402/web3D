import Image from 'next/image';
import { Info, ShieldAlert } from 'lucide-react';
import { BlogFigure } from './figures';
import type { Block } from './posts';

/** Hiển thị nội dung bài viết từ các khối dữ liệu */
export const PostBody = ({ blocks }: { blocks: Block[] }) => (
  <div className="post-body">
    {blocks.map((b, i) => {
      switch (b.type) {
        case 'p':
          return <p key={i}>{b.text}</p>;
        case 'h2':
          return <h2 key={i}>{b.text}</h2>;
        case 'list': {
          const items = b.items.map((it) => <li key={it}>{it}</li>);
          return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        case 'dialog':
          return (
            <figure key={i} className="post-dialog">
              {b.lines.map((l) => (
                <div key={l.text} className={`bubble ${l.who}`}>
                  <span className="who">{l.who === 'client' ? 'Thân chủ' : 'Người tham vấn'}</span>
                  {l.text}
                </div>
              ))}
              {b.note && <figcaption>{b.note}</figcaption>}
            </figure>
          );
        case 'figure':
          return (
            <figure key={i} className="post-figure">
              <BlogFigure figure={b.figure} />
              <figcaption>{b.caption}</figcaption>
            </figure>
          );
        case 'image':
          return (
            <figure key={i} className="post-figure photo">
              <Image
                src={b.src}
                alt={b.alt}
                width={1280}
                height={860}
                sizes="(max-width: 760px) 100vw, 720px"
                unoptimized
              />
              <figcaption>{b.caption}</figcaption>
            </figure>
          );
        case 'callout': {
          const Icon = b.tone === 'warn' ? ShieldAlert : Info;
          return (
            <aside key={i} className={`post-callout ${b.tone}`}>
              <Icon size={20} aria-hidden />
              <div>
                <b>{b.title}</b>
                <p>{b.text}</p>
              </div>
            </aside>
          );
        }
      }
    })}
  </div>
);
