"use client";

import Link from "next/link";
import type { UserConnectionItem } from "@otty/shared";

type ConnectionListCardProps = {
  href: string;
  item: UserConnectionItem;
};

export function ConnectionListCard({
  href,
  item
}: ConnectionListCardProps) {
  return (
    <Link className="connection-card connection-card--dark" href={href}>
      <p className="connection-card__name">{item.fullname || "Unknown user"}</p>
      <p className="connection-card__meta">Nickname: {item.nickname || "-"}</p>
      <p className="connection-card__meta">Title: {item.title || "-"}</p>
      <p className="connection-card__meta">
        Joining Year: {item.joiningYear ?? "-"}
      </p>
      <p className="connection-card__meta">
        Current Site: {item.currentSite || "-"}
      </p>
    </Link>
  );
}
