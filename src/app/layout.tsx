import type { Metadata } from "next";
import "./globals.css";
import { LearningProvider } from "@/components/LearningProvider";
import { Shell } from "@/components/Shell";
export const metadata: Metadata = {
  title: "PrepVista · Your aptitude workspace",
  description:
    "Learn, practise, and build independent aptitude problem-solving skills with PrepVista.",
  icons: { icon: "/prepvista.png", apple: "/prepvista.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem("pv_theme")==="light"?"light":"dark"}catch{}` }} />
      </head>
      <body>
        <LearningProvider>
          <Shell>{children}</Shell>
        </LearningProvider>
      </body>
    </html>
  );
}
