"use client";
import { t as tx, cardName, getLocale, localeHeaders } from "../i18n";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { gsap } from "gsap";
import TarotCardBack from "../components/TarotCardBack";
import TarotArt, { artSrc, TarotNamedBack } from "../components/TarotArt";
import LoadingWatch from "../components/LoadingWatch";
import Modal from "../components/Modal";
import Icon, { type IconName } from "../components/Icon";
import Link from "next/link";
import {
  CarrotCost,
  RefusalCaption,
  RefusalModal,
  useAfford,
} from "../components/Carrots";
import {
  creditsStore,
  readRefusal,
  type Refusal,
} from "../components/credits-store";
import { useAuthGate } from "../components/AuthGateProvider";
import {
  readProfile,
  profileToBirthData,
  useProfilePrefill,
  type StoredProfile,
} from "../components/profile-store";

type Topic = "love" | "career" | "personal_growth";

interface DrawnCard {
  id: string;
  name_zh: string;
  name_en: string;
  position: number;
  position_label: string;
  orientation: string;
  keywords: string[];
}

const TOPICS = (): {
  value: Topic;
  label: string;
  en: string;
  icon: IconName;
  desc: string;
  tone: string;
  ring: string;
}[] => [
  {
    value: "love",
    label: tx("爱情"),
    en: "Love",
    icon: "love",
    desc: tx("感情关系与心灵连接"),
    tone: "text-primary",
    ring: "border-primary/40",
  },
  {
    value: "career",
    label: tx("事业"),
    en: "Career",
    icon: "career",
    desc: tx("职业发展与工作机会"),
    tone: "text-gold",
    ring: "border-gold/40",
  },
  {
    value: "personal_growth",
    label: tx("个人成长"),
    en: "Growth",
    icon: "growth",
    desc: tx("自我探索与内在成长"),
    tone: "text-green",
    ring: "border-green/40",
  },
];
const SLOTS = (): { label: string; icon: IconName }[] => [
  { label: tx("过去"), icon: "past" },
  { label: tx("现在"), icon: "present" },
  { label: tx("未来"), icon: "future" },
];
// the picker always shows the full deck face-down. POST /api/draw shuffles it server-side (the order
// never reaches the client); the arc index IS the deck position, sent with drawId to POST /api/readings.
const FAN = 78;
const FAN_SPAN = 110; // degrees covered by the arc
const NUM_ZH = ["一", "二", "三"]; // zh ordinal; en/ms use {1}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function TarotPageInner() {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [step, setStep] = useState<"topic" | "question" | "draw">("topic");
  const [topic, setTopic] = useState<Topic>("love");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [readingId, setReadingId] = useState("");
  const [drawId, setDrawId] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [expired, setExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  useProfilePrefill(setProfile);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null]); // fan index placed in each slot
  const [revealed, setRevealed] = useState([false, false, false]);
  const [flipped, setFlipped] = useState(false);
  const [dragI, setDragI] = useState<number | null>(null); // fan card being dragged
  const [over, setOver] = useState<number | null>(null); // empty slot under the pointer
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fanRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ghostRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    i: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    w: number;
    active: boolean;
    pid: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const flipping = useRef(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const landing = useRef<{ slot: number; from: DOMRect; drop: boolean } | null>(
    null,
  );
  const picked = slots.filter((x): x is number => x !== null);
  const nextEmpty = slots.indexOf(null);

  // deep link from the nav dropdown: /tarot?topic=career&go=<nonce>.
  // Reacts to searchParams changes without a remount (Next keeps this page mounted); the nonce
  // makes re-picking the same topic count as a new pick. Adjust-state-during-render, no effect.
  const params = useSearchParams();
  const linkTopic = params.get("topic");
  const demo = params.get("demo") === "1";
  const { a: tarotAfford, state: credits } = useAfford("tarot");
  const blocked = !demo && !!tarotAfford && !tarotAfford.ok;
  const linkKey = `${linkTopic ?? ""}|${params.get("go") ?? ""}`;
  const [seenLink, setSeenLink] = useState<string | null>(null);
  if (linkKey !== seenLink) {
    setSeenLink(linkKey);
    if (linkTopic && TOPICS().some((x) => x.value === linkTopic)) {
      setTopic(linkTopic as Topic);
      setStep("question"); // an explicit nav pick always lands on 2/2
    }
  }

  // narrow screens scroll the arc sideways: start centred on its apex
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [step, flipped]);

  // step entrance
  useEffect(() => {
    if (reduceMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(".step-in", {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.05,
        ease: "power3.out",
      });
      if (step === "draw")
        gsap.from(".fan-card", {
          opacity: 0,
          y: 60,
          duration: 0.6,
          stagger: { amount: 0.7, from: "center" },
          ease: "power3.out",
        });
    }, rootRef);
    return () => ctx.revert();
  }, [step]);

  const place = (fan: number, slot: number, from: DOMRect, drop: boolean) => {
    landing.current = { slot, from, drop };
    setSlots((s) => {
      const n = [...s];
      n[slot] = fan;
      return n;
    });
  };
  // click / Enter / Space: fill the next empty slot
  const pick = (i: number) => {
    if (slots.includes(i) || nextEmpty < 0 || flipped) return;
    const el = fanRefs.current[i];
    if (!el) return;
    place(i, nextEmpty, el.getBoundingClientRect(), false);
  };
  // landed card travels from where it came from (fan card or drop point) into its slot
  useLayoutEffect(() => {
    const L = landing.current;
    if (!L) return;
    landing.current = null;
    const el =
      slotRefs.current[L.slot]?.querySelector<HTMLElement>(".slot-card");
    if (!el || reduceMotion()) return;
    const to = el.getBoundingClientRect();
    gsap.fromTo(
      el,
      {
        x: L.from.left - to.left,
        y: L.from.top - to.top,
        scaleX: L.from.width / to.width,
        scaleY: L.from.height / to.height,
        transformOrigin: "0 0",
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: L.drop ? 0.25 : 0.45,
        ease: L.drop ? "back.out(1.7)" : "power3.out",
        clearProps: "transform,transformOrigin",
      },
    );
  }, [slots]);

  // ---- pointer drag (mouse + touch + pen) ----
  const hitSlot = (x: number, y: number) =>
    slotRefs.current.findIndex((el, k) => {
      if (!el || slots[k] !== null) return false;
      const r = el.getBoundingClientRect();
      return (
        x >= r.left - 12 &&
        x <= r.right + 12 &&
        y >= r.top - 12 &&
        y <= r.bottom + 12
      );
    });
  const onFanDown = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (e.button !== 0 || slots.includes(i) || nextEmpty < 0 || flipped) return;
    const r = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      i,
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      w: r.width,
      active: false,
      pid: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onFanMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.active = true;
      setDragI(d.i);
      return;
    }
    const g = ghostRef.current;
    if (!g) return;
    gsap.set(g, { x: e.clientX - d.ox, y: e.clientY - d.oy });
    if (!reduceMotion())
      gsap.to(g, {
        rotation: gsap.utils.clamp(-4, 4, dx * 0.6),
        duration: 0.2,
        overwrite: "auto",
      }); // tilt toward drag direction
    const h = hitSlot(e.clientX, e.clientY);
    setOver(h < 0 ? null : h);
  };
  const endDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    cancelled: boolean,
  ) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pid) return;
    dragRef.current = null;
    if (!d.active) return; // plain click → onClick
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0); // swallow only this drag's trailing click
    const g = ghostRef.current;
    const h = cancelled ? -1 : hitSlot(e.clientX, e.clientY);
    setOver(null);
    if (h >= 0 && g) {
      place(d.i, h, g.getBoundingClientRect(), true);
      setDragI(null);
      return;
    }
    // dropped outside any slot: back to the deck
    const home = fanRefs.current[d.i]?.getBoundingClientRect();
    if (!g || !home || reduceMotion()) {
      setDragI(null);
      return;
    }
    gsap.to(g, {
      x: home.left,
      y: home.top,
      rotation: 0,
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => setDragI(null),
    });
  };
  // ghost appears under the pointer, lifted: scale 1.06 + soft shadow
  useLayoutEffect(() => {
    const d = dragRef.current,
      g = ghostRef.current;
    if (dragI === null || !d || !g) return;
    gsap.set(g, { x: d.x - d.ox, y: d.y - d.oy, width: d.w });
    if (reduceMotion()) gsap.set(g, { scale: 1.06 });
    else
      gsap.fromTo(
        g,
        { scale: 1 },
        { scale: 1.06, duration: 0.15, ease: "power2.out" },
      );
  }, [dragI]);

  // POST /api/draw → a fresh server-side shuffle of all 78 (single use, 30 min)
  const newDraw = async () => {
    const r = await fetch("/api/draw", {
      method: "POST",
      headers: localeHeaders(),
    });
    if (!r.ok) throw new Error(`draw ${r.status}`);
    const d: { drawId: string } = await r.json();
    setDrawId(d.drawId);
    return d.drawId;
  };
  // POST /api/readings with the picked positions (slot order = past/present/future).
  // 410 (expired/used draw): reshuffle once and retry the same positions; still 410 → ask to re-pick.
  const submitPicks = async (positions: number[]) => {
    const post = (id: string) =>
      creditsStore.fetch(demo ? "/api/readings?demo=1" : "/api/readings", {
        method: "POST",
        headers: localeHeaders(),
        body: JSON.stringify({
          topic,
          question,
          birthData: profileToBirthData(readProfile()),
          locale: getLocale(),
          drawId: id,
          positions,
        }),
      });
    let r = await post(drawId);
    if (r.status === 410) r = await post(await newDraw());
    if (r.status === 410) return "expired" as const;
    const refused = await readRefusal(r);
    if (refused) return refused;
    if (!r.ok) throw new Error(`readings ${r.status}`);
    const result = (await r.json()) as {
      readingId: string;
      cards: DrawnCard[];
    };
    if (demo && typeof window !== "undefined") {
      sessionStorage.setItem(
        `carot-demo-reading:${result.readingId}`,
        JSON.stringify({
          topic,
          question,
          cards: result.cards,
        }),
      );
    }
    return result;
  };
  const resetSlots = () => {
    setSlots([null, null, null]);
    setRevealed([false, false, false]);
    setFlipped(false);
  };

  const shuffle = async () => {
    if (shuffling || isLoading) return;
    setShuffling(true);
    setError("");
    try {
      await newDraw();
      setCards([]);
      setReadingId("");
      resetSlots();
      if (!reduceMotion()) {
        requestAnimationFrame(() =>
          gsap.fromTo(
            ".fan-card",
            {
              x: () => gsap.utils.random(-40, 40),
              y: () => gsap.utils.random(-20, 20),
            },
            {
              x: 0,
              y: 0,
              duration: 0.5,
              stagger: { amount: 0.5, from: "random" },
              ease: "back.out(1.4)",
            },
          ),
        );
      }
    } catch (e) {
      console.error("Error reshuffling:", e);
      setError(tx("洗牌时出现问题,请重试。"));
    } finally {
      setShuffling(false);
    }
  };

  // 3D Y-flip, 0.5s per card, face swaps in at 90°; reduced motion: crossfade
  const flip = async () => {
    if (flipping.current || flipped || revealing) return;
    if (!readingId && blocked) return;
    let drawn = cards;
    if (!readingId) {
      setRevealing(true);
      setError("");
      try {
        const res = await submitPicks(slots as number[]);
        if (res === "expired") {
          setExpired(true);
          return;
        }
        if ("error" in res) {
          setRefusal(res);
          return;
        }
        drawn = res.cards;
        setCards(res.cards);
        setReadingId(res.readingId);
      } catch (e) {
        console.error("Error revealing cards:", e);
        setError(tx("抽牌时出现问题,请重试。"));
        return;
      } finally {
        setRevealing(false);
      }
    }
    if (!drawn.length) return;
    const els = slotRefs.current
      .map((r) => r?.querySelector<HTMLElement>(".slot-card"))
      .filter(Boolean) as HTMLElement[];
    const reveal = (k: number) =>
      setRevealed((r) => {
        const n = [...r];
        n[k] = true;
        return n;
      });
    if (reduceMotion()) {
      setRevealed([true, true, true]);
      setFlipped(true);
      requestAnimationFrame(() =>
        gsap.fromTo(
          ".slot-card",
          { opacity: 0 },
          { opacity: 1, duration: 0.3, clearProps: "opacity" },
        ),
      );
      return;
    }
    flipping.current = true;
    const tl = gsap.timeline({
      onComplete: () => {
        flipping.current = false;
        setFlipped(true);
      },
    });
    els.forEach((el, k) => {
      const t0 = k * 0.15;
      tl.to(el, { rotationY: 90, duration: 0.25, ease: "power1.in" }, t0)
        .add(() => reveal(k), t0 + 0.25)
        .fromTo(
          el,
          { rotationY: -90 },
          {
            rotationY: 0,
            duration: 0.25,
            ease: "power1.out",
            immediateRender: false,
            clearProps: "transform",
          },
          t0 + 0.25,
        );
    });
  };

  const handleDrawCards = async () => {
    if (!question.trim()) return;
    if (!demo && !requireAuth("/tarot")) return;
    setIsLoading(true);
    setError("");
    try {
      await newDraw();
      setCards([]);
      setReadingId("");
      resetSlots();
      setStep("draw");
    } catch (e) {
      console.error("Error drawing cards:", e);
      setError(tx("抽牌时出现问题,请重试。"));
    } finally {
      setIsLoading(false);
    }
  };

  // the result page streams the reading itself
  const handleInterpret = () => {
    setIsLoading(true);
    router.push(`/tarot/reading/${readingId}`);
  };

  const t = TOPICS().find((x) => x.value === topic)!;
  const questionChip = (
    <p className="step-in mt-4 flex gap-3 items-center bg-surface-1 border border-border rounded-[12px] px-4 py-3 text-[15px] text-text text-left">
      <Icon name={t.icon} size={18} className={`${t.tone} shrink-0`} />“
      {question}”
    </p>
  );
  const allPicked = picked.length === 3;
  // once all positions are filled, bring the actions into view (phones: they sit below the arc)
  useEffect(() => {
    if (!allPicked || flipped) return;
    const id = window.setTimeout(() => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      actionsRef.current?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "nearest",
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [allPicked, flipped]);

  return (
    <div ref={rootRef} className="min-h-screen bg-bg pt-16 md:pt-20 pb-16">
      <div className="mx-auto max-w-[1312px] px-5 md:px-10 xl:px-16 pt-8 md:pt-12">
        {/* Step 1: topic */}
        {step === "topic" && (
          <section aria-labelledby="topic-title">
            <p className="step-in overline text-primary">Tarot · Step 1 / 2</p>
            <h1
              id="topic-title"
              className="step-in text-[32px] md:text-[40px] leading-[1.2] tracking-[0.04em] text-text mt-3"
            >
              {tx("选择占卜主题")}
            </h1>
            <p className="step-in text-[16px] text-text-2 mt-2">
              {tx("牌灵在等待你的问题")}
            </p>

            <div
              role="radiogroup"
              aria-label={tx("占卜主题")}
              className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6"
            >
              {TOPICS().map((x) => {
                const sel = topic === x.value;
                return (
                  <button
                    key={x.value}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => {
                      if (demo || requireAuth(`/tarot?topic=${x.value}`))
                        setTopic(x.value);
                    }}
                    onDoubleClick={() => {
                      if (demo || requireAuth(`/tarot?topic=${x.value}`))
                        setStep("question");
                    }}
                    className={`step-in relative text-center rounded-[var(--r-card)] border p-6 md:p-8 transition-[border-color,box-shadow,background-color] ${sel ? "border-primary bg-primary-soft shadow-[var(--glow-primary)]" : "border-border bg-surface-1 hover:border-border-strong"}`}
                  >
                    {sel && (
                      <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                        <Icon name="check" size={16} />
                      </span>
                    )}
                    <span
                      className={`mx-auto w-24 h-24 md:w-28 md:h-28 rounded-full border ${x.ring} flex items-center justify-center`}
                    >
                      <span
                        className={`w-[84%] h-[84%] rounded-full border border-dashed ${x.ring} flex items-center justify-center ${x.tone}`}
                      >
                        <Icon name={x.icon} size={40} />
                      </span>
                    </span>
                    <span
                      className={`block font-display italic text-[16px] mt-5 ${x.tone}`}
                    >
                      {x.en}
                    </span>
                    <span className="block font-[family-name:var(--font-display-zh)] font-bold text-[22px] text-text mt-1">
                      {x.label}
                    </span>
                    <span className="block text-[15px] text-text-2 mt-1">
                      {x.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="step-in mt-8 flex flex-col-reverse md:flex-row gap-4 md:items-center md:justify-between">
              <p className="flex gap-2 items-center bg-surface-1 border border-border rounded-[12px] px-4 py-3 text-[15px] text-text-3 md:max-w-md">
                <Icon name="lock" size={18} className="text-gold shrink-0" />
                {tx("请勿输入身份证号等敏感个人资料。")}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (demo || requireAuth("/tarot")) setStep("question");
                }}
                className="btn btn-primary w-full md:w-auto"
              >
                {tx("下一步:写下你的问题")}{" "}
                <Icon name="arrow_right" size={20} />
              </button>
            </div>
          </section>
        )}

        {/* Step 2: question */}
        {step === "question" && (
          <section
            aria-labelledby="q-title"
            className="md:grid md:grid-cols-12 md:gap-6"
          >
            <div className="md:col-span-8 xl:col-span-7">
              <p className="step-in overline text-primary">
                Tarot · Step 2 / 2
              </p>
              <h1
                id="q-title"
                className="step-in text-[32px] md:text-[40px] leading-[1.2] tracking-[0.04em] text-text mt-3"
              >
                {tx("你的问题是?")}
              </h1>
              <p className="step-in text-[16px] text-text-2 mt-2 flex items-center gap-2">
                <Icon name={t.icon} size={18} className={t.tone} />
                {t.label} {tx("· 诚心提问,牌灵会给予指引")}
              </p>
              {profile && (
                <p
                  className="step-in mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 bg-surface-1 border border-border rounded-[12px] px-4 py-3 text-[15px] text-text-2"
                  data-testid="profile-chip"
                >
                  <Icon
                    name="user"
                    size={18}
                    className="text-primary shrink-0"
                  />
                  <span className="text-text">
                    {profile.nickname || tx("你的资料")}
                  </span>
                  {profile.date && <span>· {profile.date}</span>}
                  <span>
                    ·{" "}
                    {profile.timeUnknown
                      ? tx("时间未知")
                      : profile.time || tx("时间未填")}
                  </span>
                  {profile.place && <span>· {profile.place}</span>}
                  {profile.timezone && (
                    <span className="text-text-3">({profile.timezone})</span>
                  )}
                  <Link
                    href="/settings"
                    className="ml-auto text-primary underline-offset-4 hover:underline"
                  >
                    {tx("修改")}
                  </Link>
                </p>
              )}
              <div className="step-in mt-8 bg-surface-1 border border-border rounded-[var(--r-card)] p-5 md:p-6">
                <label
                  htmlFor="question"
                  className="block text-[15px] text-text mb-2"
                >
                  {tx("写下你的问题")}
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={tx("例如:我和他的关系接下来会怎样?")}
                  maxLength={500}
                  autoFocus
                  className="w-full h-36 px-4 py-3 bg-bg text-text text-[16px] rounded-[12px] border border-border-strong focus:border-primary focus:outline-none focus:shadow-[var(--focus-ring)] resize-none placeholder:text-text-3"
                />
                <div className="mt-2 flex justify-between text-[15px] text-text-3">
                  <span className="flex items-center gap-2">
                    <Icon name="lock" size={18} className="text-gold" />
                    {tx("问题仅用于生成解读")}
                  </span>
                  <span className="num">{question.length}/500</span>
                </div>
                {error && (
                  <p
                    role="alert"
                    className="mt-3 flex items-center gap-2 text-[15px] text-danger"
                  >
                    <Icon name="warning" size={18} />
                    {error}
                  </p>
                )}
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setStep("topic")}
                    className="btn btn-secondary"
                  >
                    <Icon name="arrow_left" size={20} />
                    {tx("上一步")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDrawCards}
                    disabled={!question.trim() || isLoading || blocked}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {isLoading ? (
                      tx("洗牌中…")
                    ) : (
                      <>
                        {tx("开始抽牌")}{" "}
                        <CarrotCost
                          cost={
                              !demo && blocked && tarotAfford?.reason === "daily_limit"
                              ? 0
                                : demo ? undefined : tarotAfford?.cost
                          }
                        />{" "}
                        <Icon name="tarot_cards" size={20} />
                      </>
                    )}
                  </button>
                </div>
                <RefusalCaption
                  a={tarotAfford}
                  state={credits}
                  className="sm:text-right"
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 3: draw from the fan */}
        {step === "draw" && (
          <section aria-labelledby="draw-title">
            <div
              className={
                flipped
                  ? "flex flex-col items-center text-center"
                  : "md:grid md:grid-cols-12 md:gap-6 md:items-start"
              }
            >
              <div
                className={flipped ? "" : "md:col-span-6 xl:col-span-5 md:pt-6"}
              >
                <p className="step-in overline text-primary">
                  {tx("Tarot · 抽牌 ·")} {Math.min(picked.length + 1, 3)} / 3
                </p>
                <h1
                  id="draw-title"
                  className="step-in text-[28px] md:text-[36px] leading-[1.2] tracking-[0.04em] text-text mt-3"
                  aria-live="polite"
                >
                  {allPicked
                    ? flipped
                      ? tx("你的牌阵")
                      : tx("牌阵已就位")
                    : tx("凭直觉,选出第{0}张牌", [
                        NUM_ZH[picked.length],
                        picked.length + 1,
                      ])}
                </h1>
                {!flipped && questionChip}
              </div>

              <ol
                className={`step-in grid grid-cols-3 ${flipped ? "mt-8 gap-3 md:gap-8 w-full md:w-auto md:grid-cols-[repeat(3,206px)]" : "mt-6 md:mt-0 md:col-span-6 xl:col-span-5 xl:col-start-8 gap-3 md:gap-5"}`}
                aria-label={tx("牌阵")}
              >
                {SLOTS().map((s, i) => {
                  const filled = slots[i] !== null;
                  const c = cards[i];
                  const art = artSrc(c?.id);
                  const hot = over === i;
                  return (
                    <li
                      key={s.label}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        ref={(el) => {
                          slotRefs.current[i] = el;
                        }}
                        data-slot={i}
                        className={`relative w-full aspect-[2/3.5] rounded-[12px] [perspective:800px] ${filled ? "" : `outline-1 outline-dashed -outline-offset-1 transition-[outline-color,box-shadow] duration-200 flex items-center justify-center ${hot ? "outline-primary shadow-[var(--glow-primary)]" : "outline-ob-border hover:outline-primary hover:shadow-[var(--glow-primary)]"}`}`}
                      >
                        {!filled && (
                          <Icon
                            name="sparkle"
                            size={22}
                            className={hot ? "text-primary" : "text-text-3"}
                          />
                        )}
                        {filled && (
                          <div className="slot-card absolute inset-0 [transform-style:preserve-3d]">
                            {!revealed[i] ? (
                              <TarotCardBack className="shadow-[var(--shadow-1)]" />
                            ) : c && art ? (
                              <TarotArt
                                src={art}
                                alt={`${s.label}: ${cardName(c)}${c.orientation === "reversed" ? tx("(逆位)") : ""}`}
                                reversed={c.orientation === "reversed"}
                                className="shadow-[var(--shadow-1)]"
                              />
                            ) : (
                              c && (
                                <TarotNamedBack
                                  nameZh={cardName(c)}
                                  nameEn={c.name_en}
                                  reversed={c.orientation === "reversed"}
                                  className="shadow-[var(--shadow-1)]"
                                />
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-[15px] text-text-2">
                        <Icon name={s.icon} size={16} />
                        {s.label}
                        {/* reversed: art stays rotated; the upright chip lives in the label row */}
                        {revealed[i] && c?.orientation === "reversed" && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="rounded-full border border-gold/50 bg-gold/15 px-2 py-px text-[12px] md:text-[13px] leading-[18px] font-bold text-gold whitespace-nowrap">
                              {tx("逆位")}
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* fan: all 78 backs on a wide arc; mobile scrolls sideways along it */}
            {!flipped && (
              <>
                <div
                  data-testid="fan-scroller"
                  ref={scrollerRef}
                  className={`step-in relative mt-6 md:mt-4 -mx-5 md:mx-0 ${allPicked ? "pointer-events-none touch-pan-y" : ""} overflow-x-auto lg:overflow-visible overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                >
                  <div
                    className="relative mx-auto w-[1000px] lg:w-full h-[270px] md:h-[300px] xl:h-[320px]"
                    role="group"
                    aria-label={tx("完整 78 张牌,选择三张:点击或拖到牌阵")}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[min(1000px,140vw)] h-[560px] bg-[radial-gradient(closest-side,var(--c-ob-bg),transparent)]"
                    />
                    {Array.from({ length: FAN }, (_, i) => {
                      const deg = (i / (FAN - 1) - 0.5) * FAN_SPAN;
                      const taken = picked.includes(i) || dragI === i;
                      return (
                        <button
                          key={i}
                          ref={(el) => {
                            fanRefs.current[i] = el;
                          }}
                          type="button"
                          disabled={taken || allPicked}
                          onClick={() => {
                            if (suppressClick.current) {
                              suppressClick.current = false;
                              return;
                            }
                            pick(i);
                          }}
                          onPointerDown={(e) => onFanDown(e, i)}
                          onPointerMove={onFanMove}
                          onPointerUp={(e) => endDrag(e, false)}
                          onPointerCancel={(e) => endDrag(e, true)}
                          aria-label={tx("第 {0} 张牌", [i + 1])}
                          data-fan={i}
                          className={`fan-card group ${allPicked ? "touch-pan-y" : "touch-pan-x"} select-none cursor-grab active:cursor-grabbing absolute left-1/2 top-[18px] w-[52px] -ml-[26px] md:w-[60px] md:-ml-[30px] xl:w-[66px] xl:-ml-[33px] origin-[50%_420%] focus-visible:outline-none disabled:cursor-default hover:z-10 focus-visible:z-10`}
                          style={{
                            rotate: `${deg}deg`,
                            opacity: taken ? 0 : 1,
                          }}
                        >
                          {/* the lift runs along the card's own axis, i.e. radially out of the arc */}
                          <span className="block rounded-[8px] transition-[translate,box-shadow] duration-200 motion-reduce:transition-none group-hover:-translate-y-5 group-focus-visible:-translate-y-5 group-focus-visible:shadow-[var(--glow-primary)] group-hover:shadow-[var(--glow-primary)] group-disabled:translate-y-0 group-disabled:shadow-none">
                            <TarotCardBack className="shadow-[var(--shadow-1)]" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="step-in mt-2 mb-6 text-center text-[14px] text-text-3">
                  {tx("78 张牌已洗好,牌面随机隐藏")}
                  <span className="md:hidden">
                    {" "}
                    · {tx("左右滑动查看全部牌")}
                  </span>
                </p>
              </>
            )}
            {dragI !== null && (
              <div
                ref={ghostRef}
                aria-hidden="true"
                className="fixed left-0 top-0 z-50 pointer-events-none rounded-[12px] shadow-[var(--shadow-1)]"
              >
                <TarotCardBack className="shadow-[var(--shadow-1)]" />
              </div>
            )}

            <RefusalModal refusal={refusal} onClose={() => setRefusal(null)} />
            <Modal
              open={expired}
              onClose={() => {
                setExpired(false);
                resetSlots();
              }}
              tone="gold"
              title={tx("这副牌已失效")}
              message={tx("洗好的牌已过期或已被使用,请重新选择三张牌。")}
              primary={{
                label: tx("重新选牌"),
                onClick: () => {
                  setExpired(false);
                  resetSlots();
                },
              }}
            />
            {error && (
              <p
                role="alert"
                className="mt-4 text-center text-[15px] text-danger"
              >
                {error}
              </p>
            )}

            {flipped && (
              <div className="flex justify-center">{questionChip}</div>
            )}

            <div
              ref={actionsRef}
              className={`${flipped ? "mt-6" : "mt-0"} scroll-mb-6 flex flex-col-reverse sm:flex-row gap-3 justify-center`}
            >
              {isLoading || shuffling ? (
                <LoadingWatch
                  message={
                    shuffling ? tx("重新洗牌中…") : tx("白兔 正在解读你的牌...")
                  }
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={shuffle}
                    className="btn btn-secondary"
                  >
                    <Icon name="reversed" size={20} />
                    {tx("重新洗牌")}
                  </button>
                  {!flipped ? (
                    <button
                      type="button"
                      onClick={flip}
                      disabled={
                        !allPicked || revealing || (!readingId && blocked)
                      }
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {revealing
                        ? tx("正在揭晓…")
                        : allPicked
                          ? tx("翻开牌面")
                          : tx("再选 {0} 张", [3 - picked.length])}{" "}
                      {!readingId && (
                        <CarrotCost
                          cost={
                            !demo && blocked && tarotAfford?.reason === "daily_limit"
                              ? 0
                              : demo ? undefined : tarotAfford?.cost
                          }
                        />
                      )}
                      <Icon name="sparkle" size={20} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInterpret}
                      className="btn btn-primary"
                    >
                      {tx("查看解读")} <Icon name="crystal_ball" size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TarotPageRoute() {
  const params = useSearchParams();
  const restartKey = params.get("restart");
  return <TarotPageInner key={restartKey ?? "initial"} />;
}

export default function TarotPage() {
  return (
    <Suspense fallback={null}>
      <TarotPageRoute />
    </Suspense>
  );
}
