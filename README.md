# C-arot | 奇境塔罗与星盘

<div align="center">

🥕 一个融合了塔罗占卜与占星学的 AI 解读平台

*跟随白兔,踏入时光兔洞,探索自我的奇幻之旅*

</div>

---

## 📖 项目简介 (Project Overview)

C-arot 是一个以爱丽丝梦游仙境为灵感的 AI 塔罗与星盘解读网站,专为马来西亚华语用户设计。通过塔罗牌的即时指引和出生星盘的长期洞察,帮助用户更好地理解自己的当下与潜能。

**主要特色:**
- 🃏 **塔罗占卜**: 使用 CSPRNG 确保公平的三卡抽牌系统
- ✨ **出生星盘**: 基于真实天文历表计算太阳、月亮、行星位置
- 🔮 **综合解读**: AI 结合塔罗与星盘,提供深度反思
- 🐰 **奇境主题**: 兔子、胡萝卜、怀表等爱丽丝元素的优雅设计
- 🌙 **深色主题**: 黑色背景 + 胡萝卜橙主色调 + 奶油色文字

---

## 🛠 技术栈 (Tech Stack)

- **框架**: Next.js 16 (App Router) + TypeScript
- **样式**: Tailwind CSS + 自定义 Wonderland 主题
- **动画**: GSAP (页面转场、卡牌翻转、兔子洞动画)
- **数据持久化**: better-sqlite3 (本地 SQLite 数据库)
- **AI 解读**: OpenAI API (支持模拟模式)
- **天文计算**: astronomy-engine (真实星历表)
- **字体**: Noto Sans SC / Noto Serif SC (中文) + Cinzel (装饰)
- **测试**: Jest + ts-jest

---

## 📋 前置要求 (Prerequisites)

- **Node.js**: v18 或更高版本 (推荐 v20+)
- **npm**: v8 或更高版本
- **操作系统**: macOS, Linux, 或 Windows (WSL)
- **OpenAI API Key** (可选): 用于 AI 解读,未配置时使用模拟数据

---

## 🚀 快速开始 (Quick Start)

### 1. 克隆/下载项目到本地 Mac 文件夹

如果项目已在云端或 GitHub:
```bash
git clone <repository-url>
cd <project-folder>
```

如果已有项目文件夹,直接进入:
```bash
cd /path/to/c-arot
```

### 2. 安装依赖

```bash
npm install
```

这将安装所有必需的 npm 包 (大约需要 1-2 分钟)。

### 3. 配置环境变量

复制示例环境文件:
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件,添加你的 OpenAI API 密钥 (可选):
```env
# OpenAI API密钥 (可选 - 如果未设置将使用模拟数据)
OPENAI_API_KEY=sk-your-api-key-here

# OpenAI模型 (可选 - 默认: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

**注意**: 
- 如果不设置 `OPENAI_API_KEY`,应用会自动使用模拟数据,所有功能仍可正常运行
- 模拟模式会在解读前加上 `[演示模式]` 标记

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在端口 3000 启动。打开浏览器访问:
```
http://localhost:3000
```

### 5. 开始探索!

1. 点击 **"进入兔子洞"** 开始奇幻之旅
2. 填写出生信息(昵称、日期、时间、地点)
3. 选择塔罗主题(爱情/事业/个人成长)并提问
4. 观看 GSAP 动画的卡牌抽取和翻转
5. 查看 AI 生成的塔罗解读
6. 生成你的出生星盘
7. 查看塔罗与星盘的综合解读

---

## 📁 项目结构 (Project Structure)

```
.
├── app/                          # Next.js App Router 页面
│   ├── api/                      # API 路由
│   │   ├── readings/             # 塔罗读数 API
│   │   ├── birth-chart/          # 星盘计算 API
│   │   └── combined/             # 综合解读 API
│   ├── components/               # React 组件
│   │   ├── Navigation.tsx        # 汉堡菜单导航
│   │   ├── TarotCardBack.tsx    # 塔罗牌背面 SVG
│   │   └── LoadingWatch.tsx     # 怀表加载动画
│   ├── tarot/                    # 塔罗占卜页面
│   ├── birth-chart/              # 星盘页面
│   ├── combined/                 # 综合解读页面
│   ├── profile/                  # 个人资料页面
│   ├── about/                    # 关于页面
│   ├── onboarding/               # 引导页面
│   ├── globals.css               # 全局样式(Wonderland 主题)
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页(落地页)
├── lib/                          # 核心库
│   ├── data/
│   │   └── tarot-deck.json       # 78张塔罗牌数据(中英文)
│   ├── tarot/
│   │   ├── deck.ts               # 牌组验证
│   │   └── draw.ts               # CSPRNG 抽牌算法
│   ├── astrology/
│   │   ├── calculator.ts         # 星盘计算(astronomy-engine)
│   │   └── chart-renderer.ts    # SVG 星盘渲染
│   ├── ai/
│   │   └── interpreter.ts        # OpenAI 解读(含模拟模式)
│   └── store/
│       └── db.ts                 # SQLite 数据持久化
├── tests/                        # 单元测试
│   └── draw.test.ts              # 抽牌算法测试
├── data/                         # SQLite 数据库文件(运行时生成)
├── .env.example                  # 环境变量示例
├── .env.local                    # 你的环境变量(不提交)
├── package.json                  # npm 依赖和脚本
├── tsconfig.json                 # TypeScript 配置
├── jest.config.js                # Jest 测试配置
└── README.md                     # 本文件
```

---

## 🧪 运行测试 (Run Tests)

```bash
npm test
```

测试覆盖:
- ✅ 牌组验证(正好 78 张牌)
- ✅ 牌 ID 唯一性
- ✅ 抽牌返回 3 张不重复的牌
- ✅ 正位/逆位分布均衡性
- ✅ 位置标签正确性(过去/现在/未来)

---

## 🏗 构建生产版本 (Production Build)

```bash
npm run build
```

构建成功后,启动生产服务器:
```bash
npm start
```

---

## 🎨 设计主题 (Design Theme)

### 颜色方案 (Color Palette)
- **主黑色**: `#0a0a0a` (背景)
- **深炭灰**: `#1a1a1a` (卡片背景)
- **胡萝卜橙**: `#ff6b35` (主强调色)
- **奶油色**: `#f5e6d3` (文字)
- **暗绿色**: `#4a5f4f` (辅助色,胡萝卜叶)

### 字体 (Fonts)
- **正文**: Noto Sans SC (中文无衬线)
- **标题**: Noto Serif SC (中文衬线) + Cinzel (英文装饰)

### Wonderland 元素
- 🐰 白兔与兔子剪影
- 🥕 胡萝卜与胡萝卜叶图案
- 🕐 怀表与时钟
- 🃏 扑克牌图案
- ♟️ 棋盘格纹理

---

## 🔧 当前版本功能 (Current Features)

### ✅ 已实现 (Implemented)
- [x] 奇境主题首页与入场动画(兔子洞)
- [x] 用户引导流程(出生信息收集)
- [x] 汉堡菜单导航(GSAP 滑出动画)
- [x] 塔罗三卡抽取(CSPRNG + Fisher-Yates)
- [x] 卡牌翻转动画(3D CSS + GSAP)
- [x] AI 塔罗解读(OpenAI + 模拟模式)
- [x] 出生星盘计算(真实天文历表)
- [x] SVG 星盘轮渲染
- [x] 综合解读(塔罗 + 星盘)
- [x] 本地数据持久化(SQLite)
- [x] 单元测试(Jest)
- [x] 响应式设计(移动优先)
- [x] 深色 Wonderland 主题
- [x] 怀表加载动画
- [x] 免责声明页面

### 🚧 TODO (待实现)
- [ ] Leaflet 地图集成(精确出生地点选择)
- [ ] Nominatim 地理编码(搜索城市)
- [ ] 时区自动推断(tz-lookup)
- [ ] Supabase 集成(替换 SQLite)
- [ ] 支付集成(Billplz 或其他)
- [ ] 阅读历史与账户系统
- [ ] 社交分享功能
- [ ] SEO 优化(元标签、结构化数据)

---

## 🐛 已知问题与限制 (Known Issues)

### 当前版本限制
1. **地图未集成**: 出生地点目前只能手动输入文本,尚未集成 Leaflet 地图和 Nominatim 地理编码
2. **固定坐标**: 星盘计算暂时使用默认坐标(吉隆坡 3.139°N, 101.687°E)
3. **无账户系统**: 所有数据存储在本地,换设备后不保留
4. **无支付功能**: 当前版本所有解读免费,支付集成在 Supabase 版本中实现

### 模拟模式说明
在未配置 `OPENAI_API_KEY` 时,应用使用模拟数据:
- 塔罗解读会显示 `[演示模式]` 标记
- 解读内容由预定义模板生成,但仍包含抽到的牌的实际信息
- 星盘计算使用真实天文算法,不是模拟数据
- 所有 UI 流程与真实模式一致

---

## 🔐 隐私与安全 (Privacy & Security)

- **本地存储**: 用户的出生信息和问题存储在本地浏览器 `localStorage` 和 SQLite 数据库中
- **不上传个人信息**: 出生数据不会发送到服务器(除非未来集成 Supabase)
- **AI 解读**: 仅将塔罗牌信息和用户问题发送到 OpenAI API,不包含个人身份信息
- **CSPRNG**: 使用密码学安全的随机数生成器确保抽牌公平性
- **API 密钥保护**: `.env.local` 文件不会提交到 Git,密钥仅存在于服务器端

---

## 📚 依赖说明 (Dependencies)

### 核心依赖
- `next`: Next.js 框架
- `react` / `react-dom`: React 库
- `typescript`: TypeScript 支持
- `tailwindcss`: CSS 工具类框架

### 功能依赖
- `gsap`: 动画库(页面转场、卡牌翻转)
- `openai`: OpenAI API 客户端
- `zod`: 输入验证
- `better-sqlite3`: SQLite 数据库
- `astronomy-engine`: 天文计算(星历表)
- `leaflet` / `react-leaflet`: 地图组件(待集成)
- `tz-lookup`: 时区查询(待集成)

### 开发依赖
- `jest` / `ts-jest`: 测试框架
- `@testing-library/react` / `@testing-library/jest-dom`: React 测试工具

---

## 🤝 贡献指南 (Contributing)

本项目目前为个人学习/演示项目。如有建议或发现问题,欢迎:
1. 提交 Issue
2. Fork 项目并提交 Pull Request
3. 通过 Email 联系

---

## 📄 许可证 (License)

本项目仅供学习和演示使用。

**重要提醒**:
- 塔罗与占星学仅为反思与娱乐工具,非预测或专业建议
- 请勿将解读结果用于重大人生决策
- 如遇危机或重大问题,请咨询专业人士

---

## 🙏 致谢 (Acknowledgments)

- **爱丽丝梦游仙境** (Lewis Carroll) - 设计灵感来源
- **塔罗牌传统智慧** - 78 张牌的象征意义
- **占星学传统** - 星盘计算方法
- **OpenAI** - AI 解读技术
- **Next.js 团队** - 优秀的 React 框架
- **马来西亚华语用户** - 本项目的目标受众

---

<div align="center">

🥕 **跟随白兔,探索内心的时光兔洞** 🐰

Made with ❤️ and 🥕 for reflection and wonder

</div>
