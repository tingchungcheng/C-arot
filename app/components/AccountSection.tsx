"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { t as tx } from "../i18n";
import EmailAuthModal from "./EmailAuthModal";
import { localProfileStore } from "./profile-store";

type User = { email?: string; name?: string; tier: "free" | "paid" };

export default function AccountSection() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  return (
    <section
      aria-labelledby="sec-account"
      className="bg-surface-1 p-6 md:p-8 rounded-2xl border border-primary/20 mb-8"
    >
      <h2
        id="sec-account"
        className="flex items-center gap-2 text-xl font-bold text-text mb-1"
      >
        <Icon name="user" size={22} className="text-primary" />
        {tx("账户")}
      </h2>
      <p className="text-text-2 text-sm mb-4">
        {tx("登录后在不同设备保留你的个人资料与历史记录。")}
      </p>

      {!checked ? (
        <div className="h-12 rounded-xl bg-bg animate-pulse" aria-busy="true" />
      ) : user ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-bg border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-text font-semibold truncate">
                {user.name || user.email || tx("已登录")}
              </p>
              {user.email && (
                <p className="text-text-3 text-sm truncate">{user.email}</p>
              )}
            </div>
            <span
              className={`shrink-0 text-sm font-bold ${user.tier === "paid" ? "text-gold" : "text-text-2"}`}
            >
              {user.tier === "paid" ? tx("付费") : tx("免费")}
            </span>
          </div>
          {/* <p className="text-text-3 text-sm">
            {user.tier === 'paid' ? tx('你可以查看历史记录并使用星盘 AI 对话。') : tx('付费功能会在 Phase 3 接入支付后开放。')}
          </p> */}
          <a
            href="/api/auth/logout"
            onClick={() => {
              void localProfileStore.clear();
            }}
            className="btn btn-secondary w-full justify-center"
          >
            {tx("退出登录")}
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setEmailModalOpen(true)}
            className="btn btn-primary w-full justify-center"
          >
            {tx("使用邮箱登录 / 注册")}
          </button>
          <a
            href="/api/auth/login?provider=Google&returnTo=/settings"
            className="btn btn-secondary w-full justify-center"
          >
            {tx("使用 Google 登录")}
          </a>
          <p className="pt-2 text-center text-text-3 text-xs">
            {tx("登录由 AWS Cognito 安全处理。")}
          </p>
        </div>
      )}
      <EmailAuthModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </section>
  );
}
