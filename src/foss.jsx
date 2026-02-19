import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Foss2.css";
import "aos/dist/aos.css";
import AOS from "aos";
import "font-awesome/css/font-awesome.min.css";
import VanillaTilt from "vanilla-tilt";
import { addDoc, collection, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./context/AuthContext";

// HomeEvents component moved outside to prevent re-renders
const HomeEvents = memo(({ countdown1 }) => {
  const [homeEvents, setHomeEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const eventsRef = useMemo(() => collection(db, "events"), []);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const snap = await getDocs(eventsRef);
        if (!isMounted) return;

        const eventsList = snap.docs.map((docSnap) => {
          const eventData = { id: docSnap.id, ...docSnap.data() };

          const registrations = Array.isArray(eventData.registrations) ? eventData.registrations : [];
          const participantCount = registrations.length;
          const now = new Date().getTime();
          // Check if event has ended - use end time if available, otherwise use date
          let eventEndTime = null;
          if (eventData.date) {
            if (eventData.time) {
              // Combine date and time
              const dateTimeStr = `${eventData.date}T${eventData.time}`;
              eventEndTime = new Date(dateTimeStr).getTime();
            } else {
              // Use date only (end of day)
              const dateOnly = new Date(eventData.date);
              dateOnly.setHours(23, 59, 59, 999);
              eventEndTime = dateOnly.getTime();
            }
          }
          const isEnded = false; // FINALLY UNLOCKED
          const isFull = eventData.participantLimit && participantCount >= eventData.participantLimit;

          return {
            ...eventData,
            registrations,
            participantCount,
            isFull,
            isEnded,
          };
        });

        // Sort events: upcoming first (by date ascending), then ended (by date descending)
        const sortedEvents = eventsList.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          const now = new Date().getTime();
          const aEnded = a.isEnded || (dateA && now > dateA);
          const bEnded = b.isEnded || (dateB && now > dateB);

          // If both ended or both upcoming, sort by date
          if (aEnded === bEnded) {
            // Ended events: most recent first (descending)
            // Upcoming events: soonest first (ascending)
            return aEnded ? dateB - dateA : dateA - dateB;
          }
          // Upcoming events come before ended events
          return aEnded ? 1 : -1;
        }).slice(0, 2);

        if (isMounted) {
          setHomeEvents(sortedEvents);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load events", error);
        if (isMounted) {
          // Set empty array on error to prevent crashes
          setHomeEvents([]);
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="events-grid">
        {[0, 1].map((idx) => (
          <div key={idx} className="event-card skeleton-card">
            <div className="skeleton-date" />
            <div className="skeleton-details">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (homeEvents.length === 0) {
    return (
      <div className="events-grid events-grid-empty">
        <div className="event-card empty-card" data-aos="fade-up">
          <div className="empty-icon">
            <i className="fas fa-rocket" />
          </div>
          <h3>No events just yet</h3>
          <p>Our crew is working on the next release. In the meantime, explore past highlights and get notified first.</p>
          <Link to="/events" className="primary-btn" style={{ width: "100%" }}>
            Browse Events
            <i className="fas fa-arrow-right" style={{ marginLeft: "0.5rem" }}></i>
          </Link>
        </div>
        <div className="event-card empty-card secondary" data-aos="fade-up" data-aos-delay="100">
          <div className="empty-icon pulse">
            <i className="fas fa-bell" />
          </div>
          <h3>Want to host one?</h3>
          <p>Ping an office bearer or drop us a message. We’ll help you launch the next club experience.</p>
          <a href="#contact" className="secondary-btn" style={{ width: "100%", textAlign: "center" }}>
            Contact Team
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="events-grid">
      {homeEvents.map((event, idx) => {
        const eventDate = event.date ? new Date(event.date) : null;
        let day = eventDate ? eventDate.getDate() : "TBA";
        let month = eventDate ? eventDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "TBA";

        // Hardcode override for Fourth Wing date as requested
        if (event.title && event.title.toLowerCase().includes("fourth wing")) {
          day = "18";
          month = "FEB";
        }

        return (
          <div key={event.id} className="event-card" data-aos="fade-up" data-aos-delay={idx * 100}>
            <div className="event-date">
              <span className="day">{day}</span>
              <span className="month">{month}</span>
            </div>
            <div className="event-details">
              <h3>{event.title}</h3>
              <p>{event.description || "Join us for an amazing event!"}</p>
              <div className="event-actions">
                {event.title && event.title.toLowerCase().includes("fourth wing") && (
                  <>

                    <Link
                      to="/round2"
                      className="primary-btn"
                      style={{
                        marginBottom: '10px',
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        borderColor: '#ec4899',
                        width: '100%',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      Go to Round 2.0
                      <i className="fas fa-arrow-right" style={{ marginLeft: '0.5rem' }}></i>
                    </Link>
                  </>
                )}
                {event.isEnded ? (
                  <button className="primary-btn event-ended-btn" disabled>
                    <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem' }}></i>
                    Event Began
                  </button>
                ) : event.isFull ? (
                  <button className="primary-btn event-full-btn" disabled>
                    Event Full
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link to={`/events/${event.id}`} className="primary-btn">
                        Register Now
                        <i className="fas fa-arrow-right" style={{ marginLeft: '0.5rem' }}></i>
                      </Link>
                      {event.eventLink && (
                        <a
                          href={event.eventLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="primary-btn join-now-btn"
                        >
                          Join Now
                          <i className="fas fa-external-link-alt" style={{ marginLeft: '0.5rem' }}></i>
                        </a>
                      )}
                    </div>
                    {event.hasPrelims && (() => {
                      const now = new Date().getTime();
                      const prelimsDeadline = event.prelimsDeadline ? new Date(event.prelimsDeadline).getTime() : null;
                      const prelimsExpired = false; // FINALLY UNLOCKED

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {prelimsDeadline && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                              <i className="fas fa-clock" style={{ marginRight: '0.25rem' }}></i>
                              Prelims Deadline: {new Date(event.prelimsDeadline).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                          {prelimsExpired ? (
                            <button className="primary-btn" disabled style={{ opacity: 0.5 }}>
                              <i className="fas fa-hourglass-end" style={{ marginRight: '0.5rem' }}></i>
                              Prelims Closed
                            </button>
                          ) : (
                            <Link
                              to="/exam"
                              className="primary-btn"
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                borderColor: '#f59e0b'
                              }}
                            >
                              <i className="fas fa-pen-fancy" style={{ marginRight: '0.5rem' }}></i>
                              Start Prelims
                            </Link>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {event.participantLimit && (
                  <div className="event-participants">
                    <div className="participant-badge">
                      <i className="fas fa-users"></i>
                      <span>{event.participantCount || 0}/{event.participantLimit}</span>
                    </div>
                    {event.isFull && !event.isEnded && (
                      <div className="event-full-badge">Full</div>
                    )}
                    {event.isEnded && (
                      <div className="event-ended-badge" style={{ backgroundColor: '#2d3748', color: '#a0aec0' }}>Began</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="event-card view-all-card" data-aos="fade-up" data-aos-delay={200}>
        <div className="event-details" style={{ textAlign: "center", justifyContent: "center" }}>
          <div style={{ marginBottom: "1rem" }}>
            <i className="fas fa-calendar-alt" style={{ fontSize: "3rem", color: "var(--accent-color)", marginBottom: "1rem", opacity: 0.8 }}></i>
          </div>
          <h3 style={{ marginBottom: "1rem" }}>View All Events</h3>
          <p style={{ marginBottom: "2rem" }}>Discover more upcoming events and workshops</p>
          <Link to="/events" className="primary-btn" style={{ marginTop: "auto" }}>
            Explore Events
            <i className="fas fa-arrow-right" style={{ marginLeft: "0.5rem" }}></i>
          </Link>
        </div>
      </div>
    </div>
  );
});

const FossApp = () => {
  // Auth
  const { user, role } = useAuth();

  // State management
  const [countdown1, setCountdown1] = useState("");
  const [countdown2, setCountdown2] = useState("");
  const [typedText, setTypedText] = useState("");
  const [restart, setRestart] = useState(false);
  const [isNavActive, setIsNavActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [touchStart, setTouchStart] = useState(null);
  const [contactStatus, setContactStatus] = useState(null);
  const [teamPaused, setTeamPaused] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Refs
  const navbarRef = useRef(null);
  const autoplayRef = useRef(null);
  const contactMessagesRef = useMemo(() => collection(db, "contact_messages"), []);

  // Initialize AOS
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      AOS.init({ duration: 800, offset: 100, once: true });
    } else {
      // Completely disable AOS on mobile to prevent overflow issues
      AOS.init({
        disable: function () {
          return true; // Always disable on mobile
        },
        duration: 0,
        once: false
      });
    }
  }, []);

  // Navbar scroll effect and scroll indicator visibility
  useEffect(() => {
    const handleScroll = () => {
      if (navbarRef.current) {
        if (window.scrollY > 100) {
          navbarRef.current.style.background = 'rgba(26, 26, 46, 0.95)';
          navbarRef.current.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
          navbarRef.current.style.background = 'rgba(26, 26, 46, 0.7)';
          navbarRef.current.style.boxShadow = 'none';
        }
      }

      // Show/hide scroll indicator based on scroll position (visible only at top)
      const scrollIndicator = document.querySelector('.scroll-indicator');
      if (scrollIndicator) {
        if (window.scrollY === 0) {
          scrollIndicator.classList.add('visible');
        } else {
          scrollIndicator.classList.remove('visible');
        }
      }
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile menu toggle
  const toggleNav = () => {
    setIsNavActive(prev => !prev);
  };

  const navigate = useNavigate();

  // Smooth scrolling
  const smoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsNavActive(false);
    }
  };

  // Form submission handling
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const email = formData.get("email");
    const message = formData.get("message") || formData.get("Message");

    // Validate inputs
    if (!name || !email || !message) {
      setContactStatus("error");
      setTimeout(() => setContactStatus(null), 4000);
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: serverTimestamp(),
      source: "landing_contact",
    };

    try {
      setContactStatus("saving");
      await addDoc(contactMessagesRef, payload);
      setContactStatus("success");
      e.target.reset();
    } catch (error) {
      console.error("Failed to save contact message", error);
      setContactStatus("error");
    } finally {
      setTimeout(() => setContactStatus(null), 5000);
    }
  };


  // Typing effect
  useEffect(() => {
    const text = "Where Innovation Meets Open Source";
    setTypedText("");
    let index = 0;
    let timeoutId;

    const typeWriter = () => {
      if (index < text.length) {
        setTypedText(text.substring(0, index + 1));
        index++;
        timeoutId = setTimeout(typeWriter, 50);
      } else {
        // Wait 3 seconds before clearing
        timeoutId = setTimeout(() => {
          setTypedText("");
          setRestart(prev => !prev);
        }, 3000);
      }
    };

    // Small delay to ensure component is mounted
    timeoutId = setTimeout(() => {
      typeWriter();
    }, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [restart]);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const events = [
        { id: "countdown1", date: new Date("2026-02-18T00:00:00").getTime() },
        { id: "countdown2", date: new Date("2026-02-18T00:00:00").getTime() }
      ];

      const calculateTimeLeft = (eventDate) => {
        const distance = eventDate - now;
        if (distance <= 0) return "Event Began";
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      };

      setCountdown1(calculateTimeLeft(events[0].date));
      setCountdown2(calculateTimeLeft(events[1].date));
    };

    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Particles.js initialization - full page background
  useEffect(() => {
    const loadParticles = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/particles.js/2.0.0/particles.min.js';
        script.async = true;
        script.onload = () => {
          if (window.particlesJS) {
            // Create particles container for full page background
            let particlesContainer = document.getElementById("particles-js-full");
            if (!particlesContainer) {
              particlesContainer = document.createElement('div');
              particlesContainer.id = "particles-js-full";
              particlesContainer.className = "particles-full-background";
              document.body.insertBefore(particlesContainer, document.body.firstChild);
            }

            window.particlesJS("particles-js-full", {
              particles: {
                number: { value: 40 },
                color: { value: "#ffffff" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: false },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.4, width: 1 },
                move: { enable: true, speed: 6, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
              }
            });
          }
        };
        document.body.appendChild(script);
      } catch (error) {
        console.warn("Failed to load particles.js:", error);
      }
    };

    loadParticles();
  }, []);

  // Mobile detection for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Prevent horizontal scroll on mobile
    const preventHorizontalScroll = () => {
      if (window.innerWidth < 768) {
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.maxWidth = '100vw';
        document.body.style.maxWidth = '100vw';
      }
    };

    handleResize();
    preventHorizontalScroll();

    window.addEventListener('resize', () => {
      handleResize();
      preventHorizontalScroll();
    });

    // Run on initial load and after animations
    setTimeout(preventHorizontalScroll, 100);
    setTimeout(preventHorizontalScroll, 3000);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50) {
      setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
    } else if (diff < -50) {
      setCurrentSlide((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
    }

    setTouchStart(null);
  };

  // VanillaTilt initialization
  useEffect(() => {
    const elements = document.querySelectorAll(".about-card");
    elements.forEach(element => {
      VanillaTilt.init(element, {
        max: 25,
        speed: 400,
        glare: true,
        "max-glare": 0.5
      });
    });
  }, []);

  const imageBase = "https://raw.githubusercontent.com/karthikeyanrao/AMCFOSS/main/images";
  const resolveImage = useCallback((file) => `${imageBase}/${file}`, []);
  const clubLogo = resolveImage("amc-foss-logo.png");

  // Team members data
  const teamMembers = [
    {
      name: "Karthikeyan",
      role: "President",
      roleIcon: "fas fa-crown",
      photo: resolveImage("Photo.jpg"),
      social: {
        instagram: "heyy._karthi",
        github: "karthikeyanrao",
        linkedin: "karthikeyanrao-suresh"
      }
    },
    {
      name: "Maangalya",
      role: "Vice President",
      roleIcon: "fas fa-crown",
      photo: resolveImage("Maangalya.jpg"),
      social: {
        instagram: "maangalya_senthilkumar",
        github: "Maangalya K S",
        linkedin: "Maangalya-senthilkumar"
      }
    },
    {
      name: "Padmaja",
      role: "Secretary",
      roleIcon: "fas fa-crown",
      photo: resolveImage("Padmaja.jpg"),
      social: {
        instagram: "_padmaja_04",
        github: "PadmajaNagarajan",
        linkedin: "padmaja-nagarajan-07b40a28a"
      }
    },
    {
      name: "Chandana",
      role: "Joint-Secretary",
      roleIcon: "fas fa-crown",
      photo: resolveImage("Chandana.png"),
      social: {
        instagram: "chand.naaaa",
        github: "chandanakoduru",
        linkedin: "Koduru Chandana"
      }
    },
    {
      name: "Ajay",
      role: "PR",
      roleIcon: "fas fa-star",
      photo: resolveImage("Ajay.JPG"),
      social: {
        instagram: "dude_itz.ajay",
        github: "Ajay-Ravikumarrajan",
        linkedin: "ajay-ravikumarrajan-22028620b"
      }
    },
    {
      name: "Nihan Anoop",
      role: "Ofice-Bearer",
      roleIcon: "fas fa-star",
      photo: resolveImage("Nihan.png"),
      social: {
        instagram: "nihxn_ad05",
        github: "nihan-98716",
        linkedin: "m-nihan-anoop"
      }
    },
    {
      name: "Ruhan",
      role: "Office-Bearer",
      roleIcon: "fas fa-star",
      photo: resolveImage("Ruhan.jpg"),
      social: {
        instagram: "ruhan_thangamani_22",
        github: "sarahw",
        linkedin: "Ruhan Thangamani"
      }
    },
    {
      name: "SriVishnu",
      role: "Club coordinator",
      roleIcon: "fas fa-code",
      photo: resolveImage("Srivishnu.jpg"),
      social: {
        instagram: "srivishnu2805",
        github: "srivishnu2805",
        linkedin: "srivishnu-t"
      }
    }
    , {
      name: "Bhoomish",
      role: "Technical Lead",
      roleIcon: "fas fa-code",
      photo: resolveImage("Bhoomish.jpg"),
      social: {
        instagram: "sarah_designs",
        github: "sarahw",
        linkedin: "sarah-wilson"
      }
    }
    , {
      name: "Sakthi Sri Kumaran",
      role: "Technical Lead",
      roleIcon: "fas fa-code",
      photo: resolveImage("Sakthi.jpg"),
      social: {
        instagram: "sakthi0616",
        github: "Sakthi0616",
        linkedin: "sakthisrikumaran"
      }
    }
  ];

  // Auto-sliding functionality with pause support
  useEffect(() => {
    if (teamPaused) {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      return;
    }
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
    }, 3000);
    autoplayRef.current = interval;
    return () => clearInterval(interval);
  }, [teamPaused, teamMembers.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % teamMembers.length);
  };


  return (
    <div>
      <nav id="navbar" className={`navbar ${isNavActive ? 'active' : ''}`} ref={navbarRef}>
        <div className="nav-content">
          <div className="logo">
            <img src={clubLogo} alt="FOSS" className="nav-logo" />
            <span>FOSS Club</span>
          </div>
          <div
            id="navToggle"
            className={`nav-toggle ${isNavActive ? 'active' : ''}`}
            onClick={toggleNav}
            aria-expanded={isNavActive}
            aria-controls="nav-links"
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
          <ul className={`nav-links ${isNavActive ? 'active' : ''}`}>
            <li><a href="#home" onClick={(e) => smoothScroll(e, '#home')} className="active">Home</a></li>
            <li><a href="#about" onClick={(e) => smoothScroll(e, '#about')}>About</a></li>
            <li><a href="#events" onClick={(e) => smoothScroll(e, '#events')}>Events</a></li>
            <li><a href="#projects" onClick={(e) => smoothScroll(e, '#projects')}>Projects</a></li>
            <li><a href="#team" onClick={(e) => smoothScroll(e, '#team')}>Team</a></li>
            <li><a href="#contact" onClick={(e) => smoothScroll(e, '#contact')}>Contact</a></li>
            <li className="auth-links">
              {user ? (
                <Link
                  to={role === "office_bearer" ? "/office" : role === "mentor" ? "/mentor" : "/"}
                  className="auth-link"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link to="/login" className="auth-link">Login</Link>
              )}


            </li>
          </ul>
        </div>
      </nav>

      <section id="home" className="section hero">
        <div className="hero-content" data-aos="fade-up">
          <div className="hero-badge" data-aos="fade-down" data-aos-delay="100">
            <span> Welcome to AMC FOSS Club</span>
          </div>
          <h1 className="glitch hero-title" data-text="#BuildWithFOSS">
            <span className="glitch-text">#BuildWithFOSS</span>
            <span className="glitch-layer glitch-layer-1">#BuildWithFOSS</span>
            <span className="glitch-layer glitch-layer-2">#BuildWithFOSS</span>
          </h1>
          <h2 className={`hero-subtitle ${typedText ? 'typewriter' : 'typewriter-empty'}`}>
            {typedText}
          </h2>
          <p className="hero-description">
            Join a vibrant community of developers, designers, and innovators building the future of technology through
            <span className="highlight-text"> open-source collaboration</span> and <span className="highlight-text">cutting-edge innovation</span>.
          </p>
          <div className="hero-stats" data-aos="fade-up" data-aos-delay="300">
            <div className="hero-stat">
              <span className="stat-number">150+</span>
              <span className="stat-label">Contributors</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">40+</span>
              <span className="stat-label">Projects</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">25+</span>
              <span className="stat-label">Workshops</span>
            </div>
          </div>
          <div className="hero-buttons" data-aos="fade-up" data-aos-delay="400">
            <a href="#events" onClick={(e) => smoothScroll(e, '#events')} className="btn primary-btn">
              <span>Explore Events</span>
              <i className="fas fa-arrow-right"></i>
            </a>
            <a href="#about" onClick={(e) => smoothScroll(e, '#about')} className="btn secondary-btn">
              <span>Learn More</span>
              <i className="fas fa-info-circle"></i>
            </a>
            <button onClick={() => setShowJoinModal(true)} className="btn primary-btn">
              <span>Join Us</span>
              <i className="fas fa-user-plus"></i>
            </button>
          </div>
        </div>
        <div className="hero-overlay"></div>
        <div className="scroll-indicator">
          <span className="mouse">
            <span className="wheel"></span>
          </span>
          <p>Scroll Down</p>
        </div>
      </section>

      <section id="about" className="section about">
        <div className="section-content">
          <h2 className="section-title" data-aos="fade-up">About Our Club</h2>
          <p className="about-subtitle" data-aos="fade-up" data-aos-delay="100">
            A creative playground where developers, designers, and open source storytellers craft experiences together.
          </p>
          <div className="about-grid">
            <div className="about-card" data-aos="fade-right">
              <i className="fas fa-code"></i>
              <h3>Open Source Development</h3>
              <p>Learn and contribute to real-world open source projects</p>
            </div>
            <div className="about-card" data-aos="fade-up">
              <i className="fas fa-users"></i>
              <h3>Community</h3>
              <p>Join a vibrant community of developers and enthusiasts</p>
            </div>
            <div className="about-card" data-aos="fade-left">
              <i className="fas fa-laptop-code"></i>
              <h3>Workshops</h3>
              <p>Regular workshops on latest technologies and tools</p>
            </div>
          </div>
          <div className="about-highlight-grid" data-aos="fade-up" data-aos-delay="150">
            <div className="about-highlight-tile">
              <span className="highlight-value">150+</span>
              <span className="highlight-label">Active Contributors</span>
            </div>
            <div className="about-highlight-tile">
              <span className="highlight-value">40+</span>
              <span className="highlight-label">Open Source Projects</span>
            </div>
            <div className="about-highlight-tile">
              <span className="highlight-value">25</span>
              <span className="highlight-label">Mentor-Led Workshops</span>
            </div>
            <div className="about-highlight-tile">
              <span className="highlight-value">∞</span>
              <span className="highlight-label">Ideas & Collaborations</span>
            </div>
          </div>
        </div>
      </section>

      <section id="events" className="section events">
        <div className="section-content">
          <h2 className="section-title" data-aos="fade-up">Upcoming Events</h2>
          <HomeEvents countdown1={countdown1} />
        </div>
      </section>

      <section id="projects" className="section projects">
        <div className="section-content">
          <h2 className="section-title" data-aos="fade-up">Our Projects</h2>
          <div className="projects-grid">
            <div className="project-card featured" data-aos="fade-up">
              <img
                src="https://mars-images.imgix.net/seobot/osssoftware.org/65a1c64780fd6a912cffdb41-28202c73b8cd98f80c118a2059313b9b.png?auto=compress"
                alt="Featured Project"
                loading="lazy"
              />
              <div className="project-info">
                <h3>Featured: Open Source Collaboration Platform</h3>
                <p>
                  A cutting-edge platform designed to streamline open source
                  contributions and foster community collaboration.
                </p>
                <div className="project-tech">
                  <span>React</span>
                  <span>Node.js</span>
                  <span>GraphQL</span>
                </div>
                <div className="project-links">
                  <a href="#" className="github-link">View on GitHub</a>
                  <a href="#" className="demo-link">Live Demo</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Scroll Progress Bar */}
      <div className="scroll-progress" style={{ transform: `scaleX(${window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)})` }} />

      {/* Team Section */}
      <section id="team" className="section team">
        <div className="section-content">
          <h2 className="section-title" data-aos="fade-up">Meet Our Team</h2>
          <p className="section-subtitle" data-aos="fade-up" style={{ textAlign: 'center', marginTop: '-2rem' }}>The amazing people behind FOSS Club</p>

          <div className="team-slider-container">
            <div
              className="team-slider"
              onMouseEnter={() => setTeamPaused(true)}
              onMouseLeave={() => setTeamPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {teamMembers.map((member, index) => {
                // Calculate circular position relative to current slide
                const totalMembers = teamMembers.length;
                let diff = index - currentSlide;

                // Normalize diff to shortest circular distance (-totalMembers/2 to totalMembers/2)
                if (diff > totalMembers / 2) {
                  diff = diff - totalMembers;
                } else if (diff < -totalMembers / 2) {
                  diff = diff + totalMembers;
                }

                // Determine position class
                let position = '';
                if (diff === 0) {
                  position = 'active';
                } else if (diff === -1) {
                  position = 'prev';
                } else if (diff === 1) {
                  position = 'next';
                } else if (Math.abs(diff) <= 2) {
                  position = 'nearby';
                }


                const isActive = diff === 0;
                const shouldShow = isMobile ? isActive : true;

                // Calculate scale and opacity based on distance
                const absDiff = Math.abs(diff);
                const scale = absDiff === 0 ? 1 : absDiff === 1 ? 0.85 : Math.max(0.5, 1 - absDiff * 0.12);
                const opacity = isMobile ? (isActive ? 1 : 0) : (absDiff === 0 ? 1 : absDiff === 1 ? 0.7 : Math.max(0.2, 0.6 - absDiff * 0.1));
                const blur = absDiff === 0 ? 0 : absDiff === 1 ? 2 : Math.min(6, absDiff * 1.5);

                // Calculate horizontal offset - use the normalized diff
                const offsetX = diff * 120; // 120% per card for better spacing

                if (!shouldShow) {
                  return null;
                }

                return (
                  <div
                    key={index}
                    className={`team-card ${position} ${isActive ? 'current-active' : ''}`}
                    style={{
                      transform: isMobile
                        ? `translate(-50%, -50%) scale(1)`
                        : `translate(calc(-50% + ${offsetX}%), -50%) scale(${scale})`,
                      opacity: opacity,
                      pointerEvents: isMobile ? (isActive ? 'auto' : 'none') : (absDiff <= 1 ? 'auto' : 'none'),
                      zIndex: isMobile ? (isActive ? 10 : 0) : (totalMembers - absDiff),
                      filter: isMobile ? (isActive ? 'blur(0)' : 'blur(4px)') : `blur(${blur}px)`,
                      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: shouldShow ? 'block' : 'none'
                    }}
                  >

                    <div className="member-image-wrapper">
                      <img src={member.photo} alt={member.name} className="shine-effect" />
                      <div className="member-overlay">
                        <div className="social-links">
                          <a href={`https://github.com/${member.social.github}`} target="_blank" rel="noopener noreferrer" className="magnetic">
                            <i className="fab fa-github"></i>
                          </a>
                          <a href={`https://linkedin.com/in/${member.social.linkedin}`} target="_blank" rel="noopener noreferrer" className="magnetic">
                            <i className="fab fa-linkedin"></i>
                          </a>
                          <a href={`https://instagram.com/${member.social.instagram}`} target="_blank" rel="noopener noreferrer" className="magnetic">
                            <i className="fab fa-instagram"></i>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="member-info">
                      <div className="member-role-badge">
                        <i className={member.roleIcon}></i>
                        <span>{member.role}</span>
                      </div>
                      <h3 className="interactive-text" data-text={member.name}>{member.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="slider-controls">
              <button className="slider-arrow prev magnetic" onClick={handlePrevSlide}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <div className="slider-dots">
                {teamMembers.map((_, index) => (
                  <span
                    key={index}
                    className={`slider-dot ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>
              <button className="slider-arrow next magnetic" onClick={handleNextSlide}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact">
        <div className="section-content">
          <h2 className="section-title" data-aos="fade-up">Get In Touch</h2>
          <div className="contact-container">
            <div className="contact-slider">
              <div className="contact-info" data-aos="fade-right">
                <div className="contact-profile">
                  <img src={clubLogo} alt="FOSS Club" />
                </div>
                <h3 className="contact-title">FOSS Club</h3>
                <p className="contact-subtitle">Join our community of open source enthusiasts</p>
                <div className="info-item">
                  <i className="fas fa-envelope"></i>
                  <p>amcfoss@ch.amrita.com</p>
                </div>
                <div className="info-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <p>Amrita Vishwa Vidyapeetham, Chennai Campus</p>
                </div>
                <div className="social-links">
                  <a href="https://discord.gg/4vsg5Fpw"><i className="fab fa-discord"></i></a>
                  <a href="https://instagram.com/amcfoss"><i className="fab fa-instagram"></i></a>
                  <a href="https://linkedin.com/company/amcfoss"><i className="fab fa-linkedin"></i></a>
                  <a href="https://chat.whatsapp.com/JNjiwWwXNI77EUznWUwtUX"><i className="fab fa-whatsapp"></i></a>
                </div>
              </div>

              <form
                className="contact-form"
                onSubmit={handleContactSubmit}
                data-aos="fade-left"
              >
                <input type="text" name="name" placeholder="Your Name" required />
                <input type="email" name="email" placeholder="Your Email" required />
                <textarea name="message" placeholder="Your Message" required></textarea>
                <button type="submit" className="primary-btn">
                  {contactStatus === "saving" ? "Sending..." : "Send Message"}
                </button>
                {contactStatus === "success" ? (
                  <p className="contact-status success">Message Sent successfully. We will reach out soon!</p>
                ) : null}
                {contactStatus === "error" ? (
                  <p className="contact-status error">Unable to send right now. Please try again.</p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Join Us Modal */}
      {showJoinModal && (
        <div className="join-modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="join-modal" onClick={(e) => e.stopPropagation()}>
            <button className="join-modal-close" onClick={() => setShowJoinModal(false)}>
              <i className="fas fa-times"></i>
            </button>
            <h3>Join Our Community</h3>
            <p>Connect with us on our social platforms</p>
            <div className="join-social-links">
              <a href="https://discord.gg/4vsg5Fpw" target="_blank" rel="noopener noreferrer" className="join-social-link">
                <i className="fab fa-discord"></i>
                <span>Discord</span>
              </a>
              <a href="https://instagram.com/amcfoss" target="_blank" rel="noopener noreferrer" className="join-social-link">
                <i className="fab fa-instagram"></i>
                <span>Instagram</span>
              </a>
              <a href="https://linkedin.com/company/amcfoss" target="_blank" rel="noopener noreferrer" className="join-social-link">
                <i className="fab fa-linkedin"></i>
                <span>LinkedIn</span>
              </a>
              <a href="https://chat.whatsapp.com/JNjiwWwXNI77EUznWUwtUX" target="_blank" rel="noopener noreferrer" className="join-social-link">
                <i className="fab fa-whatsapp"></i>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>FOSS Club</h3>
            <p>Building the future with open source</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#events">Events</a></li>
              <li><a href="#projects">Projects</a></li>
            </ul>
          </div>

        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FOSS Club. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default FossApp;