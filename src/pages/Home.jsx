import { useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import ArrowUpRight from '../components/ArrowUpRight';

function useLandingEffects() {
  const profileRef = useRef(null);
  const artRef = useRef(null);
  useEffect(() => {
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const art = artRef.current;
    const profile = profileRef.current;
    let frame = 0;
    let pointer = null;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      art.style.removeProperty('transform');
    };
    const paint = () => {
      frame = 0;
      if (!pointer) return;
      const rect = profile.getBoundingClientRect();
      const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      if (!inside) { art.style.removeProperty('transform'); return; }
      const x = (pointer.x - rect.left) / rect.width - .5;
      const y = (pointer.y - rect.top) / rect.height - .5;
      art.style.transform = `perspective(1100px) rotateY(${x * 4}deg) rotateX(${-y * 3}deg) translate3d(${x * 10}px, ${y * 8}px, 0)`;
    };
    const move = event => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const scroll = () => { art.style.removeProperty('transform'); };
    const preferenceChanged = () => { if (reducedMotion.matches || !finePointer.matches) reset(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    reducedMotion.addEventListener('change', preferenceChanged);
    finePointer.addEventListener('change', preferenceChanged);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      reducedMotion.removeEventListener('change', preferenceChanged);
      finePointer.removeEventListener('change', preferenceChanged);
    };
  }, []);
  return { profileRef, artRef };
}

export default function Home() {
  const { profileRef, artRef } = useLandingEffects();
  return <Layout home>
    <main id="main">
      <section className="profile" ref={profileRef} aria-labelledby="profile-name">
        <div className="profile-copy">
          <h1 id="profile-name" aria-label="Anas."><span className="name-reveal" aria-hidden="true">
            {[...'Anas.'].map((letter, i) => <span key={i} className={letter === '.' ? 'name-letter name-period' : 'name-letter'} style={{ '--letter-index': i }}>{letter}</span>)}
          </span></h1>
          <p className="profile-role">Just a web security researcher interested in web exploitation and finding weird bugs</p>
          <div className="social-links">
            <a href="https://x.com/x6vrn" target="_blank" rel="noopener noreferrer">X <span>@x6vrn <ArrowUpRight /></span></a>
            <a href="https://www.linkedin.com/in/anas-almizani-5a6258271/" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true"><ArrowUpRight /></span></a>
          </div>
        </div>
        <figure className="profile-art" ref={artRef}>
          <img src="blog-assets/profile.gif" alt="Metal Gear character artwork from the original homepage" width="498" height="578" fetchPriority="high" />
        </figure>
      </section>
      <section className="writing-section" id="writing" aria-labelledby="writing-title">
        <div className="section-heading"><h2 id="writing-title">Writing</h2><span>WEB / BROWSER INTERNALS</span></div>
        <article className="post-entry">
          <a className="post-link" href="cspt-to-ato.html">
            <div className="post-meta"><span>CSPT <span className="meta-separator">/</span> WEB SECURITY</span><span>EN / AR</span></div>
            <div className="post-title-row"><h3>CSPT + Open Redirect = Account Takeover?</h3><span className="post-arrow" aria-hidden="true"><ArrowUpRight /></span></div>
            <p>chaining cspt and open redirects to leak authentication tokens.</p>
          </a>
        </article>
        <article className="post-entry">
          <a className="post-link" href="xsleaks-part1.html">
            <div className="post-meta"><span>XS-LEAKS <span className="meta-separator">/</span> CHROMIUM</span><span>7 MIN READ</span></div>
            <div className="post-title-row"><h3>The Art of XS-Leak Attacks</h3><span className="post-arrow" aria-hidden="true"><ArrowUpRight /></span></div>
            <p>A deep dive into frame-counting leaks and how they work internally in Chromium.</p>
          </a>
        </article>
      </section>
    </main>
  </Layout>;
}
