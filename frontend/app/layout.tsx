import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="grow w-full">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
