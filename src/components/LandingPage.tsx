import { ShoppingCart, Upload, CreditCard, Settings, Truck, ChevronDown, Mail, Phone, Instagram, Facebook, Twitter } from 'lucide-react';
import { StaggerTextAnimation } from './StaggerTextAnimation';
import { SEO } from './SEO';
import { GallerySection } from './GallerySection';
import { GoogleReviews } from './GoogleReviews';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onCartClick?: () => void;
  cartItemCount?: number;
}

export function LandingPage({ onGetStarted, onLogin, onCartClick, cartItemCount }: LandingPageProps) {
  const scrollToHowItWorks = () => {
    const section = document.querySelector('.how-it-works-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Structured data for the homepage
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://sheetcutters.com/#organization',
        'name': 'SheetCutters',
        'url': 'https://sheetcutters.com',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://res.cloudinary.com/dghus7hyd/image/upload/v1764958053/S__1_-removebg-preview_f2zjxm.png',
          'width': 512,
          'height': 512
        },
        'description': 'Professional laser cutting and sheet metal fabrication services in India',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': '',
          'addressLocality': 'Dharwad',
          'addressRegion': 'Karnataka',
          'postalCode': '580001',
          'addressCountry': 'IN'
        },
        'contactPoint': {
          '@type': 'ContactPoint',
          'telephone': '+91-8123629917',
          'contactType': 'Customer Service',
          'email': 'support@sheetcutters.com',
          'availableLanguage': ['English', 'Hindi'],
          'areaServed': 'IN'
        },
        'sameAs': [
          'https://www.instagram.com/sheetcutters',
          'https://www.facebook.com/sheetcutters',
          'https://twitter.com/sheetcutters'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': 'https://sheetcutters.com/#website',
        'url': 'https://sheetcutters.com',
        'name': 'SheetCutters',
        'description': 'Custom Laser Cutting & Sheet Metal Fabrication in India',
        'publisher': {
          '@id': 'https://sheetcutters.com/#organization'
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': 'https://sheetcutters.com/search?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Service',
        '@id': 'https://sheetcutters.com/#service',
        'serviceType': 'Laser Cutting & Sheet Metal Fabrication',
        'provider': {
          '@id': 'https://sheetcutters.com/#organization'
        },
        'areaServed': {
          '@type': 'Country',
          'name': 'India'
        },
        'hasOfferCatalog': {
          '@type': 'OfferCatalog',
          'name': 'Fabrication Services',
          'itemListElement': [
            {
              '@type': 'Offer',
              'itemOffered': {
                '@type': 'Service',
                'name': 'Precision Laser Cutting',
                'description': 'High-precision laser cutting services for metal sheets with 0.1mm accuracy'
              }
            },
            {
              '@type': 'Offer',
              'itemOffered': {
                '@type': 'Service',
                'name': 'Sheet Metal Fabrication',
                'description': 'Custom sheet metal fabrication services for various industries'
              }
            },
            {
              '@type': 'Offer',
              'itemOffered': {
                '@type': 'Service',
                'name': 'CAD Conversion Services',
                'description': 'Convert sketches and drawings to CAD files for manufacturing'
              }
            },
            {
              '@type': 'Offer',
              'itemOffered': {
                '@type': 'Service',
                'name': '3D Printing',
                'description': 'Professional 3D printing services for prototyping and production'
              }
            }
          ]
        }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://sheetcutters.com'
          }
        ]
      }
    ]
  };

  return (
    <>
      <SEO
        title="SheetCutters - Custom Laser Cutting & Sheet Metal Fabrication in India"
        description="Get instant quotes for precision laser cutting, CNC machining, and sheet metal fabrication. Upload your DXF/SVG files and receive custom-cut parts in 3 days. All India shipping available."
        keywords="laser cutting India, sheet metal fabrication, precision laser cutting, CNC cutting services, custom metal parts, DXF cutting, SVG cutting, metal fabrication Dharwad, 3D printing India, CAD conversion services, instant quote laser cutting, online metal cutting, stainless steel cutting, aluminum cutting, brass cutting"
        ogTitle="SheetCutters - Custom Laser Cut Parts in 3 Days | All India Shipping"
        ogDescription="Professional laser cutting and sheet metal fabrication. Instant quotes, 0.1mm precision, fast turnaround. Upload DXF/SVG files now!"
        structuredData={structuredData}
      />
      <style>{`
        /* Scrolling Ticker */
        .ticker-wrapper {
          width: 100%;
          background: #dc0000;
          overflow: hidden;
          padding: 16px 0;
          position: relative;
          z-index: 10;
        }

        .ticker {
          display: flex;
          width: fit-content;
          animation: scroll 30s linear infinite;
        }

        .ticker-item {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          white-space: nowrap;
          padding: 0 40px;
          display: flex;
          align-items: center;
          gap: 40px;
        }

        .ticker-item::after {
          content: "•";
          color: #fff;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .ticker:hover {
          animation-play-state: paused;
        }

        @media (max-width: 768px) {
          .ticker-item {
            font-size: 14px;
            padding: 0 24px;
            gap: 24px;
          }
        }

        .landing-container {
          min-height: 100vh;
          background-color: #000;
          background-image: url('https://res.cloudinary.com/dghus7hyd/image/upload/v1764832353/Hero_image_bqalyn.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .landing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          z-index: 1;
        }

        .landing-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Header */
        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 48px;
        }

        .landing-logo {
          font-family: 'Brush Script MT', cursive;
          font-size: 32px;
          color: #fff;
          font-weight: normal;
          font-style: italic;
        }

        .landing-nav {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .landing-nav-link {
          color: #fff;
          text-decoration: none;
          font-size: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .landing-nav-link:hover {
          opacity: 0.8;
        }

        .landing-login-btn {
          background: transparent;
          color: #3b82f6;
          border: 2px solid #3b82f6;
          padding: 8px 24px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .landing-login-btn:hover {
          background: #1e3a8a;
          color: #fff;
        }

        /* Hero Section */
        .landing-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 48px 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .landing-hero-title {
          font-size: 64px;
          color: #fff;
          
          line-height: 1.2;
          margin: 0 0 24px 0;
        }

        .landing-hero-subtitle {
          font-size: 18px;
          color: #fff;
          margin: 0 0 48px 0;
          opacity: 0.9;
        }

        .landing-upload-btn {
          background: #dc0000;
          color: #fff;
          border: none;
          padding: 16px 48px;
          border-radius: 4px;
          font-size: 18px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .landing-upload-btn:hover {
          background: #b80000;
        }

        .landing-footer-text {
          color: #fff;
          font-size: 16px;
          margin-top: 64px;
          opacity: 0.9;
        }

        /* Scroll Down Indicator */
        .scroll-indicator {
          position: absolute;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          z-index: 3;
          animation: bounce 2s infinite;
        }

        .scroll-indicator-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .scroll-indicator-icon {
          color: #dc0000;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-10px);
          }
          60% {
            transform: translateX(-50%) translateY(-5px);
          }
        }

        .scroll-indicator:hover {
          opacity: 0.7;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .landing-header {
            padding: 16px 24px;
          }

          .landing-logo {
            font-size: 24px;
          }

          .landing-nav {
            gap: 16px;
          }

          .landing-nav-link {
            font-size: 14px;
          }

          .landing-login-btn {
            padding: 6px 16px;
            font-size: 14px;
          }

          .landing-hero-title {
            font-size: 36px;
          }

          .landing-hero-subtitle {
            font-size: 16px;
          }

          .landing-upload-btn {
            padding: 14px 32px;
            font-size: 16px;
          }

          .landing-footer-text {
            font-size: 14px;
            margin-top: 48px;
          }
        }

        @media (max-width: 480px) {
          .landing-hero-title {
            font-size: 28px;
          }

          .landing-hero-subtitle {
            font-size: 14px;
          }
        }

        /* How It Works Section */
        .how-it-works-section {
          background: #000;
          padding: 80px 24px;
        }

        .how-it-works-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .how-it-works-title {
          font-size: 48px;
          color: #fff;
          text-align: center;
          margin: 0 0 16px 0;
        }

        .how-it-works-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin: 0 0 64px 0;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .how-it-works-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 32px 24px;
          transition: all 0.2s;
        }

        .how-it-works-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #dc0000;
        }

        .how-it-works-icon {
          color: #dc0000;
          margin-bottom: 24px;
        }

        .how-it-works-card-title {
          font-size: 20px;
          color: #fff;
          margin: 0 0 12px 0;
        }

        .how-it-works-card-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .how-it-works-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .how-it-works-section {
            padding: 48px 16px;
          }

          .how-it-works-title {
            font-size: 32px;
          }

          .how-it-works-subtitle {
            font-size: 16px;
            margin-bottom: 40px;
          }

          .how-it-works-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .how-it-works-card {
            padding: 24px 20px;
          }
        }

        /* Video Section */
        .video-section {
          background: #000;
          padding: 20px 24px 80px;
          position: relative;
        }

        .video-container {
          max-width: auto;
          margin: 0 auto;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
        }

        .video-element {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        .video-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
          text-align: center;
          width: 90%;
          max-width: 700px;
        }

        .video-title {
          font-size: 48px;
          color: #fff;
          margin: 0 0 16px 0;
        }

        .video-description {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        @media (max-width: 768px) {
          .video-section {
            padding: 48px 16px;
          }

          .video-title {
            font-size: 28px;
          }

          .video-description {
            font-size: 16px;
          }
        }

        /* Footer Section */
        .footer-section {
          background: #000;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 60px 24px;
          position: relative;
          overflow: hidden;
        }

        .footer-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 50%, rgba(220, 0, 0, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(220, 0, 0, 0.1) 0%, transparent 50%);
          z-index: 0;
        }

        .footer-top-section {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .footer-stay-in-touch {
          margin-bottom: 60px;
        }

        .footer-stay-title {
          font-size: 24px;
          color: #fff;
          margin: 0 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .footer-email-form {
          display: flex;
          gap: 12px;
          max-width: 500px;
        }

        .footer-email-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 30px;
          padding: 12px 24px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: all 0.3s;
        }

        .footer-email-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .footer-email-input:focus {
          background: rgba(255, 255, 255, 0.15);
          border-color: #dc0000;
        }

        .footer-email-button {
          background: #dc0000;
          border: none;
          border-radius: 50%;
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.3s;
        }

        .footer-email-button:hover {
          background: #b80000;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 48px;
          margin-bottom: 60px;
        }

        .footer-column h4 {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin: 0 0 20px 0;
        }

        .footer-column ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-column li {
          margin-bottom: 12px;
        }

        .footer-column a,
        .footer-column p {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
          margin: 0;
        }

        .footer-column a:hover {
          color: #dc0000;
        }

        .footer-social {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .footer-social a {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.3s;
        }

        .footer-social a:hover {
          background: #dc0000;
          border-color: #dc0000;
        }

        .footer-logo-section {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 60px 0;
        }

        .footer-large-logo {
          font-family: 'Brush Script MT', cursive;
          font-size: clamp(60px, 12vw, 180px);
          color: #dc0000;
          font-style: italic;
          text-align: center;
          line-height: 1;
          margin: 0;
          text-shadow: 0 0 60px rgba(220, 0, 0, 0.0);
        }

        .footer-tagline {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-top: 20px;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .footer-bottom {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          padding-top: 32px;
          border-top: 1px solid transparent;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 16px;
        }

        .footer-bottom-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          text-align: center;
        }

        .footer-bottom-text {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          margin: 0;
        }

        .footer-bottom-links {
          display: flex;
          gap: 16px;
        }

        .footer-bottom-link {
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 12px;
          transition: color 0.2s;
        }

        .footer-bottom-link:hover {
          color: #dc0000;
        }

        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
          }
        }

        @media (max-width: 768px) {
          .footer-section {
            padding: 40px 20px;
            min-height: auto;
          }

          .footer-stay-title {
            font-size: 18px;
          }

          .footer-email-form {
            flex-direction: column;
            max-width: 100%;
          }

          .footer-email-button {
            align-self: flex-end;
          }

          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            margin-bottom: 40px;
          }

          .footer-large-logo {
            font-size: clamp(40px, 15vw, 80px);
          }

          .footer-bottom {
            flex-direction: column;
            align-items: center;
          }

          .footer-bottom-left {
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
        }
      `}</style>

      <div className="landing-container">
        <div className="landing-overlay"></div>
        <div className="landing-content">
          {/* Header */}
          <header className="landing-header">
            <div className="landing-logo text-[32px] py-[0px] px-[8px] py-[10px]">SheetCutters</div>
            <nav className="landing-nav">
              <button className="landing-nav-link" onClick={onGetStarted}>
                Upload Files
              </button>
              {onCartClick && (
                <button
                  onClick={onCartClick}
                  className="relative p-2 text-white hover:opacity-80 rounded-lg transition-opacity"
                  aria-label="Shopping cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {(cartItemCount ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {cartItemCount! > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </header>

          {/* Hero Section */}
          <div className="landing-hero">
            <h1 className="landing-hero-title font-[Poppins] font-light">
              Custom Laser cut parts shipped in as little as 3 days.
            </h1>
            
            {/* <p className="landing-hero-subtitle font-[Poppins] font-light">
              Sheet metal fabrication, 3D Printing, and much more.
            </p> */}
            
            <button className="landing-upload-btn" onClick={onGetStarted}>
              Upload Files
            </button>
            <p className="landing-footer-text font-[Poppins] font-light">
              No Cad? Send us a Sketch, and we'll take care of the rest!
            </p>
          </div>

          {/* Scroll Down Indicator */}
          <div className="scroll-indicator mx-[0px] my-[11px]" onClick={scrollToHowItWorks}>
            <span className="scroll-indicator-text pt-[0px] pr-[0px] pb-[-14px] pl-[0px] mt-[0px] mr-[0px] mb-[-14px] ml-[0px]">Learn More</span>
            <ChevronDown className="scroll-indicator-icon" size={32} />
          </div>

          {/* Scrolling Ticker */}
          <div className="ticker-wrapper">
            <div className="ticker">
              <span className="ticker-item">INSTANT QUOTES</span>
              <span className="ticker-item">ALL INDIA SHIPPING</span>
              <span className="ticker-item">WAIT LESS. MAKE MORE.</span>
              <span className="ticker-item">PRECISION LASER CUTTING</span>
              <span className="ticker-item">INSTANT QUOTES</span>
              <span className="ticker-item">ALL INDIA SHIPPING</span>
              <span className="ticker-item">WAIT LESS. MAKE MORE.</span>
              <span className="ticker-item">PRECISION LASER CUTTING</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          <h2 className="how-it-works-title font-[Poppins] font-light">How it works</h2>
          <p className="how-it-works-subtitle font-[Poppins] font-light">
            From digital file to physical part in four simple steps. We've streamlined the process to get you making faster.
          </p>

          <div className="how-it-works-grid">
            <div className="how-it-works-card">
              <Upload className="how-it-works-icon" size={40} />
              <h3 className="how-it-works-card-title font-[Poppins] font-light">1. Upload</h3>
              <p className="how-it-works-card-description font-[Poppins] font-light">
                Upload your DXF files. Our system instantly checks for errors.
              </p>
            </div>

            <div className="how-it-works-card">
              <CreditCard className="how-it-works-icon" size={40} />
              <h3 className="how-it-works-card-title font-[Poppins] font-light">2. Quote</h3>
              <p className="how-it-works-card-description font-[Poppins] font-light">
                Choose your material and get real-time pricing. No hidden fees.
              </p>
            </div>

            <div className="how-it-works-card">
              <Settings className="how-it-works-icon" size={40} />
              <h3 className="how-it-works-card-title font-[Poppins] font-light">3. We Cut</h3>
              <p className="how-it-works-card-description font-[Poppins] font-light">
                Our industrial lasers cut your parts with 0.1mm precision.
              </p>
            </div>

            <div className="how-it-works-card">
              <Truck className="how-it-works-icon" size={40} />
              <h3 className="how-it-works-card-title font-[Poppins] font-light">4. Ship</h3>
              <p className="how-it-works-card-description font-[Poppins] font-light">
                Parts are cleaned, packed, and shipped directly to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <GallerySection />

      {/* Video Section */}
      <section className="video-section">
        <h2 className="video-title font-[Poppins] font-light text-center text-[32px]">Precision Meets Speed</h2>
        {/* <p className="video-description font-[Poppins] font-light text-center px-[0px] py-[10px]">
                Watch our state-of-the-art laser cutting technology bring your designs to life with unmatched accuracy.
              </p> */}
        <div className="video-container">
          <div className="video-wrapper">
            <video
              className="video-element"
              autoPlay
              loop
              muted
              playsInline
              loading="lazy"
              preload="none"
            >
              <source src="https://www.pexels.com/download/video/11595382/" type="video/mp4" />
            </video>
            <div className="video-overlay bg-[rgba(0,0,0,0.5)]"></div>
            <div className="video-content">
              
              
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <GoogleReviews />

      {/* Footer Section */}
      <footer className="footer-section">
        <div className="footer-top-section">
          {/* Stay In Touch Section */}
          <div className="footer-stay-in-touch">
            <h3 className="footer-stay-title">Stay In Touch</h3>
            <form className="footer-email-form" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="footer-email-input"
              />
              <button type="submit" className="footer-email-button" aria-label="Subscribe">
                <Mail size={20} color="#fff" />
              </button>
            </form>
          </div>

          {/* Footer Links Grid */}
          <div className="footer-grid">
            <div className="footer-column">
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href="mailto:info@sheetcutters.com">
                    Support@sheetcutters.com
                  </a>
                </li>
                <li>
                  <a href="tel:+918217753454">
                    +91-8217753454
                  </a>
                </li>
                <li>
                  <p>Dharwad, Karnataka, India</p>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Services</h4>
              <ul>
                <li><a href="#laser-cutting" onClick={onGetStarted}>Laser Cutting</a></li>
                <li><a href="#Convert-sketch" onClick={onGetStarted}>Convert Sketch to CAD</a></li>

              </ul>
            </div>

            <div className="footer-column">
              <h4>Information</h4>
              <ul>
                <li><a href="https://legal.sheetcutters.com/#/philosophy" target="_blank">Our Philosophy</a></li>
                <li><a href="https://legal.sheetcutters.com/#/contact" target="_blank">Contact Us</a></li>
                <li><a href="https://legal.sheetcutters.com/#/testimonials" target="_blank">Testamonials</a></li>
                <li><a href="https://legal.sheetcutters.com/#/privacy" target="_blank">Privacy Policy</a></li>
                <li><a href="https://legal.sheetcutters.com/#/returns" target="_blank">Returns and Exchanges</a></li>
                <li><a href="https://legal.sheetcutters.com/#/shipping" target="_blank">Shipping Policy</a></li>
                <li><a href="https://legal.sheetcutters.com/#/terms" target="_blank">Terms and Conditions</a></li>
                <li><a href="https://legal.sheetcutters.com/#/affiliate" target="_blank">Affiliate terms</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Follow Us</h4>
              <div className="footer-social">
                <a href="#instagram" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
                <a href="#facebook" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
                <a href="#twitter" aria-label="Twitter">
                  <Twitter size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Large Logo Section */}
        <div className="footer-logo-section">
          <StaggerTextAnimation text="SheetCutters" className="footer-large-logo" />
          <p className="footer-tagline">Precision laser cutting for makers & professionals</p>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p className="footer-bottom-text">© 2025 SheetCutters. All rights reserved.</p>
            <p className="footer-bottom-text">Designed and Developed in India, For India.</p>
            <p className="footer-bottom-text"><a href="https://www.linkedin.com/in/swapnilmankame/" className="text-[rgba(255,255,255,0.5)]">By Swapnil Mankame</a></p>
          </div>
          
        </div>
      </footer>
    </>
  );
}