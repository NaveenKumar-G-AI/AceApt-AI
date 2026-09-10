import type { Metadata } from "next";
import "./globals.css";
import { LearningProvider } from "@/components/LearningProvider";
import { Shell } from "@/components/Shell";
export const metadata: Metadata = {
  title: "ACEAPT · Your aptitude workspace",
  description:
    "Learn, practise, and build independent aptitude problem-solving skills.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LearningProvider>
          <Shell>{children}</Shell>
        </LearningProvider>
      </body>
    </html>
  );
}
