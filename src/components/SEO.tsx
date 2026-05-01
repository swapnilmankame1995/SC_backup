import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  structuredData?: object;
}

export function SEO({
  title = 'SheetCutters - Custom Laser Cutting & Sheet Metal Fabrication in India',
  description = 'Get instant quotes for precision laser cutting, CNC machining, and sheet metal fabrication. Upload your DXF/SVG files and receive custom-cut parts in 3 days. All India shipping available.',
  keywords = 'laser cutting, sheet metal fabrication, CNC cutting, precision cutting, custom metal parts, DXF cutting, SVG cutting, India laser cutting, metal fabrication, 3D printing, CAD services',
  ogTitle,
  ogDescription,
  ogImage = 'https://sheetcutters.com/og-image.jpg',
  ogUrl = 'https://sheetcutters.com',
  twitterCard = 'summary_large_image',
  canonicalUrl = 'https://sheetcutters.com',
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (selector: string, attribute: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (attribute === 'name' || attribute === 'property') {
          element.setAttribute(attribute, selector.replace(/meta\[(name|property)="([^"]+)"\]/, '$2'));
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('meta[name="description"]', 'name', description);
    updateMetaTag('meta[name="keywords"]', 'name', keywords);
    updateMetaTag('meta[name="robots"]', 'name', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMetaTag('meta[name="author"]', 'name', 'SheetCutters');
    updateMetaTag('meta[name="viewport"]', 'name', 'width=device-width, initial-scale=1.0');
    
    // Open Graph tags
    updateMetaTag('meta[property="og:type"]', 'property', 'website');
    updateMetaTag('meta[property="og:title"]', 'property', ogTitle || title);
    updateMetaTag('meta[property="og:description"]', 'property', ogDescription || description);
    updateMetaTag('meta[property="og:image"]', 'property', ogImage);
    updateMetaTag('meta[property="og:url"]', 'property', ogUrl);
    updateMetaTag('meta[property="og:site_name"]', 'property', 'SheetCutters');
    updateMetaTag('meta[property="og:locale"]', 'property', 'en_IN');

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'name', twitterCard);
    updateMetaTag('meta[name="twitter:title"]', 'name', ogTitle || title);
    updateMetaTag('meta[name="twitter:description"]', 'name', ogDescription || description);
    updateMetaTag('meta[name="twitter:image"]', 'name', ogImage);

    // Language and geo tags
    updateMetaTag('meta[name="geo.region"]', 'name', 'IN-KA');
    updateMetaTag('meta[name="geo.placename"]', 'name', 'Dharwad, Karnataka');
    updateMetaTag('meta[http-equiv="content-language"]', 'http-equiv', 'en-IN');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Helper function to add link tag
    const addLinkTag = (rel: string, href: string, type?: string, sizes?: string) => {
      let link = document.querySelector(`link[rel=\"${rel}\"]${type ? `[type=\"${type}\"]` : ''}${sizes ? `[sizes=\"${sizes}\"]` : ''}`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (type) link.setAttribute('type', type);
        if (sizes) link.setAttribute('sizes', sizes);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Favicon Setup - Optimized for Google Search Results & Maximum Compatibility
    // Using hybrid approach: Cloudinary PNG (for Google/SEO) + Local SVG (for modern browsers)
    const FAVICON_PNG = 'https://res.cloudinary.com/dghus7hyd/image/upload/v1765893024/favicon_bqhm4q.png';
    const FAVICON_SVG = '/favicon.svg';
    
    // Primary favicon - PNG for Google Search (48x48 minimum, CRITICAL for SEO)
    addLinkTag('icon', FAVICON_PNG, 'image/png', '48x48');
    
    // High-res PNG for better displays
    addLinkTag('icon', FAVICON_PNG, 'image/png', '192x192');
    
    // SVG favicon for modern browsers (scalable, crisp at any size)
    addLinkTag('icon', FAVICON_SVG, 'image/svg+xml');
    
    // Shortcut icon (legacy support)
    addLinkTag('shortcut icon', FAVICON_PNG);
    
    // PWA Manifest
    addLinkTag('manifest', '/manifest.json');
    
    // Theme color for mobile browsers
    updateMetaTag('meta[name=\\\"theme-color\\\"]', 'name', '#dc0000');
    updateMetaTag('meta[name=\\\"apple-mobile-web-app-capable\\\"]', 'name', 'yes');
    updateMetaTag('meta[name=\\\"apple-mobile-web-app-status-bar-style\\\"]', 'name', 'black-translucent');
    updateMetaTag('meta[name=\\\"apple-mobile-web-app-title\\\"]', 'name', 'SheetCutters');
    
    // Apple touch icon (for iOS home screen) - Use PNG for best compatibility
    addLinkTag('apple-touch-icon', FAVICON_PNG);

    // Structured Data (JSON-LD)
    const defaultStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'SheetCutters',
      'url': 'https://sheetcutters.com',
      'logo': {
        '@type': 'ImageObject',
        'url': FAVICON_PNG,
        'width': 512,
        'height': 512
      },
      'description': 'Professional laser cutting and sheet metal fabrication services in India',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': 'Dharwad',
        'addressRegion': 'Karnataka',
        'addressCountry': 'IN'
      },
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+91-8123629917',
        'contactType': 'Customer Service',
        'email': 'support@sheetcutters.com',
        'availableLanguage': ['English', 'Hindi']
      },
      'sameAs': [
        'https://www.instagram.com/sheetcutters',
        'https://www.facebook.com/sheetcutters',
        'https://twitter.com/sheetcutters'
      ],
      'priceRange': '₹₹',
      'areaServed': {
        '@type': 'Country',
        'name': 'India'
      },
      'serviceType': ['Laser Cutting', 'Sheet Metal Fabrication', 'CNC Machining', '3D Printing', 'CAD Services']
    };

    // Add or update structured data script
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(structuredData || defaultStructuredData);

  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterCard, canonicalUrl, structuredData]);

  return null;
}