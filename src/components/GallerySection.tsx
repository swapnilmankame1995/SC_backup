import { useState, useRef } from "react";
import { X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GALLERY_CONFIG, GALLERY_ITEMS } from "../config/gallery-content";

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  description: string;
}

export function GallerySection() {
  const [selectedImage, setSelectedImage] =
    useState<GalleryItem | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  const galleryItems: GalleryItem[] = GALLERY_ITEMS;

  // Split items into two rows
  const row1Items = galleryItems.slice(0, 4);
  const row2Items = galleryItems.slice(4, 8);

  const handleImageClick = (item: GalleryItem) => {
    // Only open modal if not dragging (no actual movement occurred)
    if (!hasMoved) {
      setSelectedImage(item);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, rowId: string) => {
    const row = rowId === 'row1' ? row1Ref.current : row2Ref.current;
    if (!row) return;
    
    setIsDragging(rowId);
    setHasMoved(false);
    setStartX(e.pageX - row.offsetLeft);
    setScrollLeft(row.scrollLeft);
    row.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent, rowId: string) => {
    if (isDragging !== rowId) return;
    e.preventDefault();
    
    const row = rowId === 'row1' ? row1Ref.current : row2Ref.current;
    if (!row) return;
    
    const x = e.pageX - row.offsetLeft;
    const walk = (x - startX) * 2; // Multiply for faster scroll
    
    // Mark that movement occurred
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    
    row.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = (rowId: string) => {
    if (isDragging === rowId) {
      const row = rowId === 'row1' ? row1Ref.current : row2Ref.current;
      if (row) {
        row.style.cursor = 'grab';
      }
      setIsDragging(null);
      // Reset hasMoved after a short delay to allow click to process
      setTimeout(() => setHasMoved(false), 50);
    }
  };

  return (
    <>
      <style>{`
        .gallery-section {
          background: #000;
          padding: 20px 0 80px;
          overflow: hidden;
        }

        .gallery-title {
          font-size: 48px;
          color: #fff;
          text-align: center;
          margin: 0 0 16px 0;
        }

        .gallery-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin: 0 0 64px 0;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .gallery-rows-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .gallery-row-wrapper {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          position: relative;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        .gallery-row-wrapper::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .gallery-row {
          display: flex;
          gap: 24px;
          width: fit-content;
          cursor: grab;
        }

        .gallery-row.dragging {
          cursor: grabbing;
          animation-play-state: paused !important;
        }

        /* Row 1 scrolls left to right */
        .gallery-row-1 {
          animation: scrollRight 60s linear infinite;
        }

        /* Row 2 scrolls right to left */
        .gallery-row-2 {
          animation: scrollLeft 60s linear infinite;
        }

        @keyframes scrollRight {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scrollLeft {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .gallery-row:hover {
          animation-play-state: paused;
        }

        .gallery-item {
          flex: 0 0 400px;
          height: 300px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .gallery-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1;
          pointer-events: none;
        }

        .gallery-item:hover {
          transform: scale(1.05);
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .gallery-item-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
          padding: 24px;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          z-index: 2;
        }

        .gallery-item:hover .gallery-item-overlay {
          transform: translateY(0);
        }

        .gallery-item-title {
          color: #fff;
          font-size: 18px;
          margin: 0;
        }

        /* Modal Styles */
        .gallery-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .gallery-modal-content {
          max-width: 1200px;
          width: 100%;
          background: #1a1a1a;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .gallery-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #dc0000;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: background 0.2s;
        }

        .gallery-modal-close:hover {
          background: #b80000;
        }

        .gallery-modal-image {
          width: 100%;
          max-height: 70vh;
          object-fit: contain;
          background: #000;
        }

        .gallery-modal-text {
          padding: 32px;
          background: #1a1a1a;
        }

        .gallery-modal-title {
          font-size: 32px;
          color: #fff;
          margin: 0 0 16px 0;
        }

        .gallery-modal-description {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 768px) {
          .gallery-section {
            padding: 48px 0;
          }

          .gallery-title {
            font-size: 32px;
            padding: 0 16px;
          }

          .gallery-subtitle {
            font-size: 16px;
            margin-bottom: 40px;
            padding: 0 16px;
          }

          .gallery-rows-container {
            gap: 16px;
          }

          .gallery-row {
            gap: 16px;
          }

          .gallery-item {
            flex: 0 0 280px;
            height: 200px;
          }

          /* Speed up animation on mobile */
          .gallery-row-1 {
            animation: scrollRight 60s linear infinite;
          }

          .gallery-row-2 {
            animation: scrollLeft 60s linear infinite;
          }

          .gallery-modal-content {
            margin: 0;
          }

          .gallery-modal-text {
            padding: 24px;
          }

          .gallery-modal-title {
            font-size: 24px;
          }

          .gallery-modal-description {
            font-size: 16px;
          }
        }
      `}</style>

      <section className="gallery-section">
        <h2 className="gallery-title font-[Poppins] font-light">{GALLERY_CONFIG.title}</h2>

        <p className="gallery-subtitle font-[Poppins] font-light">
          {GALLERY_CONFIG.subtitle}
        </p>

        <div className="gallery-rows-container">
          {/* Row 1 */}
          <div
            className="gallery-row-wrapper"
            ref={row1Ref}
            onMouseDown={(e) => handleMouseDown(e, 'row1')}
            onMouseMove={(e) => handleMouseMove(e, 'row1')}
            onMouseUp={() => handleMouseUpOrLeave('row1')}
            onMouseLeave={() => handleMouseUpOrLeave('row1')}
          >
            <div
              className={`gallery-row gallery-row-1 ${isDragging === 'row1' ? 'dragging' : ''}`}
            >
              {/* Render items 3 times for infinite loop effect */}
              {[...row1Items, ...row1Items, ...row1Items].map(
                (item, index) => (
                  <div
                    key={`row1-${index}`}
                    className="gallery-item"
                    onClick={() => handleImageClick(item)}
                  >
                    <ImageWithFallback
                      src={item.image}
                      alt={item.title}
                      draggable="false"
                    />
                    <div className="gallery-item-overlay">
                      <h3 className="gallery-item-title font-[Poppins] font-light">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div
            className="gallery-row-wrapper"
            ref={row2Ref}
            onMouseDown={(e) => handleMouseDown(e, 'row2')}
            onMouseMove={(e) => handleMouseMove(e, 'row2')}
            onMouseUp={() => handleMouseUpOrLeave('row2')}
            onMouseLeave={() => handleMouseUpOrLeave('row2')}
          >
            <div
              className={`gallery-row gallery-row-2 ${isDragging === 'row2' ? 'dragging' : ''}`}
            >
              {/* Render items 3 times for infinite loop effect */}
              {[...row2Items, ...row2Items, ...row2Items].map(
                (item, index) => (
                  <div
                    key={`row2-${index}`}
                    className="gallery-item"
                    onClick={() => handleImageClick(item)}
                  >
                    <ImageWithFallback
                      src={item.image}
                      alt={item.title}
                      draggable="false"
                    />
                    <div className="gallery-item-overlay">
                      <h3 className="gallery-item-title font-[Poppins] font-light">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {selectedImage && (
        <div
          className="gallery-modal"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="gallery-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="gallery-modal-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Close modal"
            >
              <X size={24} color="#fff" />
            </button>
            <ImageWithFallback
              src={selectedImage.image}
              alt={selectedImage.title}
              className="gallery-modal-image"
            />
            <div className="gallery-modal-text">
              <h3 className="gallery-modal-title font-[Poppins] font-light">
                {selectedImage.title}
              </h3>
              <p className="gallery-modal-description font-[Poppins] font-light">
                {selectedImage.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}