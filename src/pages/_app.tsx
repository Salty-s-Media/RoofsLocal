import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../../_components/home/Navbar";
import Footer from "../../_components/home/Footer";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
