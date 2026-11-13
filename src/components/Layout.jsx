export default function Layout({ children, home = false }) {
  return <div className="site-shell" dir="ltr">
    <a className="skip-link" href="#main" lang="en">Skip to content</a>
    <header className="site-header" id="top" lang="en">
      <a className="site-name" href="/">ANAS</a>
      <nav aria-label="Main navigation"><a href={home ? '#writing' : '/#writing'}>Writing</a></nav>
    </header>
    {children}
    <footer className="site-footer" lang="en">
      <span>Anas <span className="footer-separator">/</span> Web security research</span>
      <a href="#top">Back to top ↑</a>
    </footer>
  </div>;
}
