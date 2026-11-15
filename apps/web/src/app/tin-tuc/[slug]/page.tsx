import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Leaves } from '@/components/ui';
import { PostBody } from '@/features/blog/PostBody';
import { PostCard, PostMeta } from '@/features/blog/PostCard';
import { findPost, POSTS } from '@/features/blog/posts';
import { PublicFooter } from '@/features/blog/PublicFooter';
import { PublicHeader } from '@/features/blog/PublicHeader';

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = findPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

/** Trang bài viết công khai */
export default async function PostPage({ params }: Params) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const others = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <div className="pub">
      <Leaves />
      <PublicHeader />
      <main className="pub-main">
        <article className="post">
          <Link href="/#bai-viet" className="back">
            <ChevronLeft size={16} aria-hidden />
            Tất cả bài viết
          </Link>
          <header className="post-head">
            <span className="chip">{post.category}</span>
            <h1>{post.title}</h1>
            <p className="lead">{post.excerpt}</p>
            <PostMeta post={post} />
            <p className="small muted">Nhóm Lab FourT</p>
          </header>
          <div className="post-cover">
            <Image
              src={post.cover}
              alt={post.coverAlt}
              fill
              priority
              sizes="(max-width: 1000px) 100vw, 960px"
              style={{ objectFit: 'cover', objectPosition: post.coverFocus ?? 'center' }}
              unoptimized
            />
          </div>
          <PostBody blocks={post.body} />
        </article>

        <section className="post-more" aria-labelledby="more-title">
          <h2 id="more-title">Bài viết khác</h2>
          <div className="post-grid">
            {others.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
