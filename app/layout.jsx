import "../css/reset.css";
import "../css/variables.css";
import "../css/layout.css";
import "../css/hero.css";
import "../css/nav.css";
import "../css/cards.css";
import "../css/lab.css";
import "../css/responsive.css";

// 引入 Next.js 内置脚本组件
import Script from 'next/script'

export const metadata = {
  title: "麦麦.vip",
  description: "个人主页 + 文字实验室",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      {/* 1. 初始化 dataLayer：保证在 gtm.js 加载前执行 */}
      <Script id="gtm-init" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}
      </Script>

      {/* 2. 加载外部 gtm.js：页面可交互后异步加载，不阻塞首屏 */}
      <Script
        id="gtm-script"
        src="https://www.googletagmanager.com/gtm.js?id=GTM-53JPKK8Z"
        strategy="afterInteractive"
        async
      />

      <body>
        <div className="app-shell">
          <div className="page-shell">
            <main className="page-content">{children}</main>
          </div>
        </div>

        {/* 底部备案信息 - 先放ICP，公安通过后再补 */}
        <footer style={{
          textAlign: 'center',
          padding: '20px 16px',
          fontSize: '14px',
          color: '#666',
          borderTop: '1px solid #eee'
        }}>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#666', textDecoration: 'none' }}
          >
            辽ICP备2026027768号
          </a>
        </footer>

      </body>
    </html>
  );
}
