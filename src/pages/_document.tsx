import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <title>Roofs Local</title>
      <meta property="og:title" content="Roof's Local" />
      <meta
        property="og:description"
        content="Providing best in class lead aquistion tools for roofing contractors."
      />
      <meta
        charSet="utf-8"
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />
      <meta
        name="description"
        content="Providing best in class lead aquistion tools for roofing contractors."
      />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
