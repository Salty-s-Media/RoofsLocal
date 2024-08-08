import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Script from 'next/script';
import Navbar from "../../_components/home/Navbar";
import Footer from "../../_components/home/Footer";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* <Navbar /> */}
      <script
        type="text/javascript"
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyAXP_ydphQGqK2MFpFbVfjKsu5TYZKNSaA&libraries=places`}
      />
      <Component {...pageProps} />
      {/* <Footer /> */}
    </>
  );
}
