import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavbarDemo } from "../components/Navbar";
import TranslatableText from "../components/TranslatableText";
import LanguageSelector from "../components/LanguageSelector";

/* ───────────── tiny hook: fade-in on scroll ───────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/* ───────────── animated counter ───────────── */
function AnimatedCounter({ target, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const step = Math.ceil(target / (duration / 16));
        let cur = 0;
        const id = setInterval(() => {
          cur = Math.min(cur + step, target);
          setCount(cur);
          if (cur >= target) clearInterval(id);
        }, 16);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ───────────── section reveal wrapper ───────────── */
function RevealSection({ children, className = "", delay = 0 }) {
  const [ref, visible] = useReveal(0.12);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ───────────── decorative heading underline ───────────── */
function HeadingAccent({ className = "" }) {
  return (
    <span className={`block mx-auto mt-4 h-1 w-16 rounded-full bg-primary ${className}`} />
  );
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();

  /* parallax offset for hero */
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-sand-light text-gray-800 overflow-x-hidden">
      {/* ────── Navbar ────── */}
      <header className="p-4 md:px-10 flex items-center justify-between gap-4">
        <NavbarDemo />
        <LanguageSelector />
      </header>

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative isolate flex flex-col-reverse lg:flex-row items-center justify-between gap-12 px-6 md:px-16 pt-12 pb-24 lg:py-36 overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-sand/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-sand/20 blur-3xl" />

        {/* text */}
        <div className="relative z-10 lg:w-1/2 text-center lg:text-left space-y-7 max-w-xl mx-auto lg:mx-0">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase text-primary-dark border border-primary-200">
            <TranslatableText textKey="hero_badge">🙏 Sacred Odisha Awaits</TranslatableText>
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-gray-900">
            <TranslatableText textKey="hero_title">
              Odisha Pilgrim{" "}
              <span className="relative inline-block text-primary">
                Yatra
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 120 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 5.5C20 2 40 2 60 4.5C80 7 100 3 118 5" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" className="animate-[draw_1s_ease-out_0.5s_forwards]" style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: 'draw 1s ease-out 0.5s forwards' }} />
                </svg>
              </span>
            </TranslatableText>
          </h1>

          <TranslatableText
            textKey="hero_description"
            tag="p"
            className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed"
          >
            Experience Odisha's sacred spirit and cultural grandeur — a journey that begins
            at the holy Jagannath Temple in Puri, flows through the architectural wonder of
            Konark, and finds peace in the ancient shrines of Bhubaneswar.
          </TranslatableText>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <button
              onClick={() => navigate("/map")}
              className="group relative px-8 py-3.5 bg-[#4F46E5] text-white rounded-2xl font-semibold shadow-lg shadow-primary-300/40 hover:shadow-xl hover:shadow-primary-400/40 hover:bg-primary-light hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-primary-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">
                <TranslatableText textKey="btn_explore_temples">Explore Temples</TranslatableText>
              </span>
            </button>
            <button
              onClick={() => navigate("/itineraryai")}
              className="px-8 py-3.5 bg-primary-50 border-2 border-primary-300 text-primary-dark rounded-2xl font-semibold hover:bg-primary-100 hover:border-primary-400 hover:-translate-y-0.5 transition-all duration-300"
            >
              <TranslatableText textKey="btn_plan_yatra">Plan Your Yatra</TranslatableText>
            </button>
          </div>
        </div>

        {/* hero image */}
        <div className="relative z-10 lg:w-1/2 flex justify-center">
          {/* glow behind image */}
          <div className="absolute inset-0 m-auto h-72 w-72 lg:h-96 lg:w-96 rounded-full bg-primary-200/30 blur-3xl" />
          <img
            src="https://phool.co/cdn/shop/articles/172017492135594_1024x1024.jpg?v=1726044181"
            alt="Jagannath Temple"
            className="relative w-full max-w-sm lg:max-w-lg rounded-[2rem] shadow-2xl shadow-primary-900/15 object-cover ring-1 ring-primary-100 hover:scale-[1.02] transition-transform duration-700"
            style={{ transform: `translateY(${scrollY * 0.04}px)` }}
          />
          {/* floating stat badge */}
          <div className="absolute -bottom-4 -left-2 sm:left-4 backdrop-blur-xl bg-white/80 border border-primary-100 rounded-2xl px-5 py-3 shadow-xl">
            <p className="text-2xl font-bold text-primary">700+</p>
            <p className="text-xs text-gray-500 font-medium">Ancient Temples</p>
          </div>
        </div>
      </section>

      {/* ════════════════════ STATS BAR ════════════════════ */}
      <RevealSection className="relative -mt-8 mx-4 md:mx-16 mb-16">
        <div className="backdrop-blur-xl bg-white/70 border border-primary-100/60 rounded-3xl shadow-xl shadow-primary-100/30 px-6 py-8 sm:py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 700, suffix: "+", label: "Historic Temples" },
            { value: 480, suffix: " km", label: "Coastline" },
            { value: 62, suffix: "+", label: "Tribal Communities" },
            { value: 3, suffix: "", label: "UNESCO Sites" },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-3xl sm:text-4xl font-extrabold text-primary">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* ════════════════════ WHY ODISHA ════════════════════ */}
      <section className="px-6 md:px-16 py-20">
        <RevealSection className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-sand text-primary border border-primary-200 mb-4">
            Destinations
          </span>
          <TranslatableText
            textKey="why_odisha_title"
            tag="h2"
            className="text-3xl md:text-5xl font-extrabold text-gray-900"
          >
            Why You Should Travel to Odisha
          </TranslatableText>
          <HeadingAccent />
          <TranslatableText
            textKey="why_odisha_desc"
            tag="p"
            className="mt-4 text-gray-500 text-base lg:text-lg leading-relaxed"
          >
            Odisha is a land where spirituality meets nature — ancient temples,
            golden beaches, tribal culture, and rich heritage make it a perfect
            destination for pilgrims and travelers alike.
          </TranslatableText>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Puri – The Sacred Dham",
              img: "https://assets.cntraveller.in/photos/685ba76e22966cd9daef4ba2/16:9/w_1024%2Cc_limit/GettyImages-509348753.jpg",
              desc: "One of the Char Dhams of India, famous for Lord Jagannath and the grand Rath Yatra festival.",
              accent: "primary-600",
            },
            {
              title: "Konark – Sun Temple",
              img: "https://cdn.magicdecor.in/com/2023/02/29213046/image-1685112860-3601.jpg",
              desc: "A UNESCO World Heritage Site, known for its chariot-shaped design and intricate carvings.",
              accent: "primary-600",
            },
            {
              title: "Bhubaneswar – City of Temples",
              img: "https://imagedelivery.net/dmcxpiIQ1lAgOmi_eg0IzQ/89cbb154-4e1b-4661-c4e7-392de0a2a200/public",
              desc: "Home to more than 700 temples blending ancient architecture with modern culture.",
              accent: "primary-500",
            },
          ].map((place, i) => (
            <RevealSection key={i} delay={i * 120}>
              <div className="group relative rounded-3xl overflow-hidden bg-white shadow-lg shadow-gray-200/60 hover:shadow-2xl hover:shadow-primary-200/40 transition-all duration-500 hover:-translate-y-1">
                <div className="relative overflow-hidden h-60">
                  <img
                    src={place.img}
                    alt={place.title}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-${place.accent} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                </div>
                <div className="p-6">
                  <TranslatableText
                    textKey={`place_title_${i}`}
                    tag="h3"
                    className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors"
                  >
                    {place.title}
                  </TranslatableText>
                  <TranslatableText
                    textKey={`place_desc_${i}`}
                    tag="p"
                    className="mt-2 text-gray-500 text-sm leading-relaxed"
                  >
                    {place.desc}
                  </TranslatableText>
                </div>
                {/* bottom accent bar */}
                <div className={`h-1 w-0 group-hover:w-full bg-${place.accent} transition-all duration-500`} />
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ════════════════════ BEACHES ════════════════════ */}
      <section className="relative px-6 md:px-16 py-24 bg-sand/60 overflow-hidden">
        {/* decorative circle */}
        <div className="pointer-events-none absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-primary-200/20 blur-3xl" />

        <RevealSection className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative group">
            <img
              src="https://static-blog.treebo.com/wp-content/uploads/2023/05/Aryapalli-Beach-1024x675.jpg"
              alt="Puri Beach"
              className="rounded-3xl shadow-lg shadow-primary-200/30 object-cover h-80 md:h-96 w-full group-hover:scale-[1.01] transition-transform duration-700"
            />
            {/* small floating card */}
            <div className="absolute bottom-4 right-4 backdrop-blur-xl bg-white/80 border border-primary-100 rounded-xl px-4 py-2.5 shadow-lg">
              <p className="text-sm font-bold text-primary">🌅 Chandrabhaga</p>
              <p className="text-[11px] text-gray-500">Best sunrise in East India</p>
            </div>
          </div>

          <div className="space-y-5 max-w-lg">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-sand text-primary border border-primary-200">
              Beaches
            </span>
            <TranslatableText
              textKey="beach_subtitle"
              tag="h2"
              className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight"
            >
              Puri & Chandrabhaga Beach
            </TranslatableText>
            <TranslatableText
              textKey="beach_desc"
              tag="p"
              className="text-gray-500 text-base lg:text-lg leading-relaxed"
            >
              Odisha's coastline offers peaceful beaches where pilgrims can
              relax after darshan. The sunrise at Chandrabhaga Beach is one of
              the most beautiful sights in eastern India.
            </TranslatableText>
            <button
              onClick={() => navigate("/map")}
              className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-primary-dark hover:gap-3 transition-all duration-300"
            >
              Explore on map
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </RevealSection>
      </section>

      {/* ════════════════════ CULTURE & FOOD ════════════════════ */}
      <section className="px-6 md:px-16 py-24">
        <RevealSection className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-sand text-primary border border-primary-200 mb-4">
            Heritage
          </span>
          <TranslatableText
            textKey="culture_title"
            tag="h2"
            className="text-3xl md:text-5xl font-extrabold text-gray-900"
          >
            Culture & Cuisine
          </TranslatableText>
          <HeadingAccent />
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Tribal & Folk Culture",
              img: "https://www.puriholidays.com/Travel_Photo/1424913653_OdishaTribes.jpg",
              desc: "Odissi dance, tribal festivals, and handloom crafts reflect Odisha's rich artistic traditions.",
              icon: "🎭",
            },
            {
              title: "Sacred Food",
              img: "https://www.bunkarvalley.com/wp-content/uploads/2025/06/Mahaprasad-of-Puri.jpg",
              desc: "Mahaprasad of Jagannath Temple is considered divine and is shared by devotees from all walks of life.",
              icon: "🍛",
            },
            {
              title: "Local Cuisine",
              img: "https://www.treebo.com/blog/wp-content/uploads/2025/05/Pakhala-Bhata-1024x675.jpg",
              desc: "Pakhala rice, Chuda mix, and Dalma form the heart of Odia cuisine — simple yet deeply spiritual.",
              icon: "🥘",
            },
          ].map((item, i) => (
            <RevealSection key={i} delay={i * 120}>
              <div className="group relative rounded-3xl overflow-hidden bg-white shadow-lg shadow-gray-200/60 hover:shadow-2xl hover:shadow-primary-200/40 transition-all duration-500 hover:-translate-y-1">
                <div className="relative overflow-hidden h-56">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {/* icon badge */}
                  <span className="absolute top-4 right-4 text-2xl bg-white/80 backdrop-blur-sm rounded-xl w-10 h-10 flex items-center justify-center shadow group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </span>
                </div>
                <div className="p-6">
                  <TranslatableText
                    textKey={`culture_title_${i}`}
                    tag="h3"
                    className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors"
                  >
                    {item.title}
                  </TranslatableText>
                  <TranslatableText
                    textKey={`culture_desc_${i}`}
                    tag="p"
                    className="mt-2 text-gray-500 text-sm leading-relaxed"
                  >
                    {item.desc}
                  </TranslatableText>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ════════════════════ CTA ════════════════════ */}
      <RevealSection>
        <section className="relative mx-4 md:mx-16 mb-20 rounded-[2rem] overflow-hidden">
          {/* gradient background */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }} />
          {/* subtle pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative z-10 text-center px-6 py-20 sm:py-28">
            <TranslatableText
              textKey="cta_title"
              tag="h2"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight"
            >
              Begin Your Sacred Journey Today
            </TranslatableText>
            <TranslatableText
              textKey="cta_desc"
              tag="p"
              className="mt-4 text-gray-300 max-w-xl mx-auto text-base sm:text-lg leading-relaxed"
            >
              Plan your Odisha pilgrimage and explore temples, beaches, and
              culture in one divine journey.
            </TranslatableText>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/itineraryai")}
                className="group px-10 py-3.5 bg-white text-primary rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <TranslatableText textKey="btn_start_yatra">Start Your Yatra</TranslatableText>
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => navigate("/family-tracker")}
                className="px-10 py-3.5 border-2 border-white/40 text-white rounded-2xl font-semibold hover:bg-white/10 hover:border-white/60 transition-all duration-300"
              >
                <TranslatableText textKey="btn_family_tracker">Family Tracker</TranslatableText>
              </button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="border-t border-primary-100/40 bg-sand-light px-6 md:px-16 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="font-bold text-lg text-gray-900 flex items-center gap-2 justify-center md:justify-start">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white text-sm">🙏</span>
              Route Mind
            </p>
            <TranslatableText
              textKey="footer_tagline"
              tag="p"
              className="text-sm text-gray-400 mt-1"
            >
              Your guide to sacred Odisha
            </TranslatableText>
          </div>

          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => navigate("/map")} className="hover:text-primary transition-colors">
              Map
            </button>
            <button onClick={() => navigate("/itineraryai")} className="hover:text-primary transition-colors">
              Itinerary AI
            </button>
            <button onClick={() => navigate("/family-tracker")} className="hover:text-primary transition-colors">
              Family Tracker
            </button>
          </div>

          <TranslatableText
            textKey="footer_text"
            tag="p"
            className="text-sm text-gray-400"
          >
            © 2026 Odisha Pilgrim. All rights reserved.
          </TranslatableText>
        </div>
      </footer>
    </div>
  );
};

export default Home;
