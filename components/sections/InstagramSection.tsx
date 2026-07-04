"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { INSTAGRAM_POSTS, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagramFeed";

export function InstagramSection() {
  return (
    <section className="w-full bg-cream py-16 md:py-24">
      {/* Instagram profile card — compact, centered */}
      <div className="mx-auto w-full max-w-[540px] px-0 sm:px-4">

        {/* ── Profile header ────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 mb-6 px-4">
          {/* Avatar with Instagram-style gradient ring */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Meros on Instagram"
          >
            <div
              className="allow-round p-[4px] overflow-hidden"
              style={{
                background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)",
              }}
            >
              <div className="bg-cream overflow-hidden w-[76px] h-[76px] sm:w-[90px] sm:h-[90px] md:w-[100px] md:h-[100px] flex items-center justify-center">
                <div className="relative w-[88%] h-[88%]">
                  <Image
                    src="/logos/logo-terracotta.png"
                    alt="Meros logo"
                    fill
                    className="object-contain"
                    sizes="110px"
                  />
                </div>
              </div>
            </div>
          </a>

          {/* Handle + verified badge */}
          <div className="flex items-center gap-1.5">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-headline text-midnight text-[1.15rem] sm:text-[1.3rem] leading-none hover:opacity-70 transition-opacity duration-200"
            >
              {INSTAGRAM_HANDLE}
            </a>
            <VerifiedBadge />
          </div>

          {/* Follow CTA */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 px-6 py-1.5 bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold rounded-lg transition-colors duration-200"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            Follow
          </a>
        </div>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-midnight/15 mb-[2px]" />

        {/* ── 3-column grid ─────────────────────────────────────────── */}
        <div
          className="grid grid-cols-3"
          style={{ gap: "2px" }}
        >
          {INSTAGRAM_POSTS.slice(0, 9).map((post, i) => (
            <GridTile key={post.id} post={post} index={i} />
          ))}
        </div>

        {/* ── View all link ─────────────────────────────────────────── */}
        <div className="flex justify-center mt-5 px-4">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body-caps text-xs text-juniper hover:text-midnight transition-colors duration-300 tracking-body-caps"
          >
            View all on Instagram →
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Grid tile ─────────────────────────────────────────────────────────────────

interface GridTileProps {
  post: (typeof INSTAGRAM_POSTS)[number];
  index: number;
}

function GridTile({ post, index }: GridTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        delay: Math.min((index % 3) * 0.05, 0.15),
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative block overflow-hidden"
      style={{ aspectRatio: "4/5" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={post.imageUrl}
        alt={post.caption}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 935px) 311px, 311px"
        className="object-cover"
        style={{
          transform: hovered ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Hover overlay — desktop only */}
      <div
        className="hidden sm:flex absolute inset-0 flex-col items-center justify-center gap-3"
        style={{
          background: "rgba(0,0,0,0.45)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      >
        <HeartIcon />
        <p className="font-body-mixed text-white text-center text-xs px-3 leading-snug line-clamp-2">
          {post.caption}
        </p>
      </div>
    </motion.a>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Verified"
      role="img"
    >
      <circle cx="20" cy="20" r="20" fill="#0095f6" />
      <path
        d="M11 20.5l6.5 6.5 12-13"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
