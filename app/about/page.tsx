import Icon from '../components/Icon';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <Icon name="pocket_watch" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">关于 C-arot</h1>
          <p className="text-text/60">时光兔洞的故事</p>
        </div>

        <div className="space-y-8">
          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="carrot" size={22} className="mr-3 text-primary" />
              C-arot 是什么?
            </h2>
            <p className="text-text leading-relaxed mb-4">
              C-arot 是一个结合了塔罗占卜与占星学的 AI 解读平台,专为马来西亚华语用户设计。
              我们以爱丽丝梦游仙境的奇幻世界为灵感,用兔子与胡萝卜的意象,邀请你跟随白兔的脚步,
              踏入探索内心的时光兔洞。
            </p>
            <p className="text-text leading-relaxed">
              通过塔罗牌的即时指引和出生星盘的长期洞察,C-arot 帮助你更好地理解自己的当下与潜能。
            </p>
          </section>

          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="tarot_cards" size={22} className="mr-3 text-primary" />
              塔罗与星盘
            </h2>
            <p className="text-text leading-relaxed mb-4">
              <strong className="text-primary">塔罗占卜</strong> 使用传统的 78 张塔罗牌,
              通过三张牌的"过去-现在-未来"牌阵,为你的问题提供反思性的指引。
              每张牌都经过 CSPRNG(密码学安全伪随机数生成器)确保公平抽取。
            </p>
            <p className="text-text leading-relaxed">
              <strong className="text-primary">出生星盘</strong> 基于你的出生日期、时间和地点,
              计算太阳、月亮、行星的位置和相位,揭示你的性格特质和人生主题。
            </p>
          </section>

          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="ai" size={22} className="mr-3 text-primary" />
              AI 解读
            </h2>
            <p className="text-text leading-relaxed">
              所有解读由 AI 生成,结合了传统塔罗与占星学的智慧,以富有同理心、
              鼓励性的语言呈现。AI 不会使用恐惧、威胁或强制性的语言,
              所有建议都是反思性的,而非预测性的。
            </p>
          </section>

          <section className="bg-gradient-to-br from-primary/20 to-leaf/20 p-8 rounded-2xl border border-primary/40">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="warning" size={22} className="mr-3 text-primary" />
              重要声明
            </h2>
            <div className="text-text leading-relaxed space-y-3">
              <p>
                • <strong>反思与娱乐工具</strong>: 塔罗与占星学是自我探索和反思的工具,
                并非确定的预测或专业建议。
              </p>
              <p>
                • <strong>非专业建议</strong>: C-arot 不提供医疗、法律、财务或其他专业咨询。
                如遇重要决策或危机,请咨询相关专业人士。
              </p>
              <p>
                • <strong>隐私保护</strong>: 你的问题和个人资料存储在本地浏览器中,
                仅用于生成解读,不会被第三方获取。
              </p>
              <p>
                • <strong>自主选择</strong>: 所有解读仅供参考,最终的选择权在你手中。
                相信自己的判断和直觉。
              </p>
            </div>
          </section>

          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="rabbit" size={22} className="mr-3 text-primary" />
              奇境之旅
            </h2>
            <p className="text-text leading-relaxed">
              就像爱丽丝跟随白兔踏入奇境一样,C-arot 邀请你开启一段自我发现的旅程。
              在这个时光兔洞里,塔罗与星盘的智慧将为你照亮前路,
              帮助你更好地理解自己的过去、现在和未来的可能性。
            </p>
            <p className="text-text/60 mt-4 text-center italic">
              "我们都有点疯狂,这没什么不对。" — 爱丽丝梦游仙境
            </p>
          </section>
        </div>

        <div className="mt-12 text-center text-sm text-text/40">
          <p>Made with <Icon name="carrot" size={18} className="inline align-[-3px] text-primary" /> for reflection and wonder</p>
          <p className="mt-2">© 2026 C-arot · 本地运行版本</p>
        </div>
      </div>
    </div>
  );
}
