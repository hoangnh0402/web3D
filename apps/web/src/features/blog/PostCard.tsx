import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { formatPostDate, type Post } from './posts';

const Meta = ({ post }: { post: Post }) => (
  <p className="post-meta">
    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
    <span aria-hidden>·</span>
    <span>
      <Clock size={13} aria-hidden /> {post.readMinutes} phút đọc
    </span>
  </p>
);

/** Thẻ bài viết. Bản nổi bật nằm ngang và lớn hơn. */
export const PostCard = ({ post, featured }: { post: Post; featured?: boolean }) => (
  <article className={`post-card ${featured ? 'featured' : ''}`}>
    <div className="post-card-img">
      <Image
        src={post.cover}
        alt=""
        fill
        sizes={featured ? '(max-width: 900px) 100vw, 620px' : '(max-width: 900px) 100vw, 380px'}
        style={{ objectFit: 'cover', objectPosition: post.coverFocus ?? 'center' }}
        priority={featured}
        unoptimized
      />
      <span className="chip">{post.category}</span>
    </div>
    <div className="post-card-text">
      <Meta post={post} />
      <h3>
        <Link href={`/tin-tuc/${post.slug}`}>{post.title}</Link>
      </h3>
      <p className="excerpt">{post.excerpt}</p>
      <span className="read-more" aria-hidden>
        Đọc bài <ArrowRight size={15} />
      </span>
    </div>
  </article>
);

export { Meta as PostMeta };
