import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen antialiased">
        
      <Navbar />
      <main>{children}</main>
      <Footer />
      </body>

      </html>
  );
}
