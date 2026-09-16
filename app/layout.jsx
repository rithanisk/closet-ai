import '../src/styles.css';

export const metadata = {
  title: 'Closet AI',
  description: 'Your wardrobe, styled for real life.',
};

export const viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
