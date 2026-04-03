/**
 * Root HTML for Expo Router web export.
 * Custom favicon from hosted SVG (tab / URL bar icon).
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const FAVICON_SVG =
  'https://yadvhvt9zjohl7ms.public.blob.vercel-storage.com/emotional-intelligence-mandala-art%20%285%29.svg';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link rel="icon" href={FAVICON_SVG} type="image/svg+xml" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
/* RN Web chat inputs: remove default focus ring (blue rectangle) */
textarea:focus, textarea:focus-visible,
input:focus, input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
