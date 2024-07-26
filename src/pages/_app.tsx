import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Navbar from "../../_components/home/Navbar";
import Footer from "../../_components/home/Footer";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const fetchEnvVariable = async () => {
      const response = await fetch('/api/env');
      const data = await response.json();
      console.log(data.message);
    };

    fetchEnvVariable();
  }, []);

  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
