'use client';
import { t as tx } from '../i18n';
import Icon from '../components/Icon';
import CarrotWordmark from '../components/CarrotWordmark';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <Icon name="pocket_watch" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">{tx('关于')} <CarrotWordmark className="text-[1.15em] font-normal" /></h1>
          <p className="text-text/60">{tx('时光兔洞的故事')}</p>
        </div>

        <div className="space-y-8">
          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="carrot" size={22} className="mr-3 text-primary" />
              {tx('C-arot 是什么?')}
            </h2>
            <p className="text-text leading-relaxed mb-4">
              {tx('C-arot 的名字来自一个小小的文字游戏：Tarot 变成 Carot，Carot 让人想到 Carrot（胡萝卜），胡萝卜引来了兔子，而兔子，把我们带进了爱丽丝的仙境。跟随白兔的脚步，踏入探索内心的时光兔洞。')}
            </p>
            <p className="text-text leading-relaxed">
              {tx('在这里，塔罗牌给你当下的指引，出生星盘照见你长期的特质与潜能，两者结合，帮助你更好地理解自己。')}
            </p>
          </section>

          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="tarot_cards" size={22} className="mr-3 text-primary" />
              {tx('塔罗与星盘')}
            </h2>
            <p className="text-text leading-relaxed mb-4">
              <strong className="text-primary">{tx('塔罗占卜')}</strong> {tx('使用传统的 78 张塔罗牌,\n              通过三张牌的"过去-现在-未来"牌阵,为你的问题提供反思性的指引。')}
            </p>
            <p className="text-text leading-relaxed">
              <strong className="text-primary">{tx('出生星盘')}</strong> {tx('基于你的出生日期、时间和地点,\n              计算太阳、月亮、行星的位置和相位,揭示你的性格特质和人生主题。')}
            </p>
          </section>


          <section className="bg-gradient-to-br from-primary/20 to-leaf/20 p-8 rounded-2xl border border-primary/40">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="warning" size={22} className="mr-3 text-primary" />
              {tx('重要声明')}
            </h2>
            <div className="text-text leading-relaxed space-y-3">
              <p>
                • <strong>{tx('反思与娱乐工具')}</strong>{tx(': 塔罗与占星学是自我探索和反思的工具,\n                并非确定的预测或专业建议。')}
              </p>
              <p>
                • <strong>{tx('非专业建议')}</strong>{tx(': C-arot 不提供医疗、法律、财务或其他专业咨询。\n                如遇重要决策或危机,请咨询相关专业人士。')}
              </p>
              <p>
                • <strong>{tx('隐私保护')}</strong>{tx('：你的问题与个人资料仅用于生成解读，我们不会出售或与第三方分享你的数据。')}
              </p>
              <p>
                • <strong>{tx('自主选择')}</strong>{tx(': 所有解读仅供参考,最终的选择权在你手中。\n                相信自己的判断和直觉。')}
              </p>
            </div>
          </section>

          <section className="bg-surface-1 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
              <Icon name="rabbit" size={22} className="mr-3 text-primary" />
              {tx('奇境之旅')}
            </h2>
            <p className="text-text leading-relaxed">
              {tx('就像爱丽丝跟随白兔踏入奇境一样,C-arot 邀请你开启一段自我发现的旅程。\n              在这个时光兔洞里,塔罗与星盘的智慧将为你照亮前路,\n              帮助你更好地理解自己的过去、现在和未来的可能性。')}
            </p>
            <p className="text-text/60 mt-4 text-center italic">
              {tx('"我们都有点疯狂,这没什么不对。" — 爱丽丝梦游仙境')}
            </p>
          </section>
        </div>

        <div className="mt-12 text-center text-sm text-text/40">
          <p>Made with <Icon name="carrot" size={18} className="inline align-[-3px] text-primary" /> for reflection and wonder</p>
          <p className="mt-2">{tx('© 2026 C-arot · 本地运行版本')}</p>
        </div>
      </div>
    </div>
  );
}
