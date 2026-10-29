"use client";

import React from "react";
import Image from "next/image";

interface IconProps {
  name:
    | "dashboard"
    | "user"
    | "book"
    | "file-up"
    | "history"
    | "folder"
    | "notifications"
    | "home"
    | "signout"
    | "search"
    | "bell"
    | "arrow-right";
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className = "" }: IconProps) {
  return (
    <Image
      src={`/assets/icon-${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
