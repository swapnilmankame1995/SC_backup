import { useState } from 'react';
import { StepIndicator } from './StepIndicator';
import { Checkbox } from './ui/checkbox';
import { WhatsAppContactLink } from './WhatsAppContactLink';

interface SketchChecklistScreenProps {
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function SketchChecklistScreen({ onNext, onBack, onCancel }: SketchChecklistScreenProps) {
  const [checks, setChecks] = useState({
    clearlySketch: false,
    visibleDimensions: false,
    allCallouts: false,
  });

  const allChecked = checks.clearlySketch && checks.visibleDimensions && checks.allCallouts;

  const handleCheckChange = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <style>{`
        .sketch-checklist-container {
          min-height: 100vh;
          background-color: #222222;
          padding-bottom: 100px;
        }

        .sketch-checklist-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        .sketch-checklist-card {
          background: #1a1a1a;
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 48px;
          margin-top: 24px;
        }

        .checklist-title {
          font-size: 28px;
          font-weight: 600;
          color: #e5e5e5;
          text-align: center;
          margin-bottom: 48px;
          line-height: 1.4;
        }

        .checklist-content-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 64px;
          align-items: center;
        }

        .sketch-example-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .sketch-example-image {
          max-width: 100%;
          height: auto;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 16px;
          background: #1a1a1a;
        }

        .checklist-items {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          border: 2px solid #2B2B2B;
          border-radius: 8px;
          padding: 20px;
          background: #2B2B2B;
          transition: all 0.3s ease;
        }

        .checklist-item.checked {
          border-color: #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          background: #1e3a8a;
        }

        .checklist-item button[data-slot="checkbox"] {
          cursor: pointer !important;
        }

        .checklist-item-text {
          font-size: 16px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
          user-select: none;
        }

        .checklist-item.checked .checklist-item-text {
          color: #e5e5e5;
        }

        .checklist-item-text strong {
          font-weight: 600;
          color: #e5e5e5;
        }

        .checklist-item.checked .checklist-item-text strong {
          color: #3b82f6;
        }

        .checklist-footer {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid #2d3748;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .guidelines-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 14px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-weight: 500;
        }

        .guidelines-link:hover {
          text-decoration: underline;
        }

        .footer-buttons {
          display: flex;
          gap: 12px;
        }

        .cancel-btn {
          padding: 10px 32px;
          border: 1px solid #2d3748;
          border-radius: 4px;
          background: transparent;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
          font-weight: 500;
          text-align: center;
        }

        .cancel-btn:hover {
          background: #1e293b;
        }

        .back-btn {
          padding: 10px 32px;
          border: 1px solid #2d3748;
          border-radius: 4px;
          background: transparent;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
          font-weight: 500;
          text-align: center;
        }

        .back-btn:hover {
          background: #1e293b;
        }

        .next-btn {
          padding: 10px 40px;
          border: none;
          border-radius: 4px;
          background: #3b82f6;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          text-align: center;
        }

        .next-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .next-btn:disabled {
          background: #1e293b;
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 968px) {
          .checklist-content-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .sketch-checklist-card {
            padding: 32px 24px;
          }

          .checklist-title {
            font-size: 22px;
          }

          .checklist-footer {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .footer-buttons {
            flex: 1;
          }

          .cancel-btn,
          .back-btn,
          .next-btn {
            flex: 1;
            min-width: 0;
            padding-left: 8px;
            padding-right: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      `}</style>

      <div className="sketch-checklist-container " >
        <StepIndicator
          currentStep={0}
          steps={['Upload', 'Material', 'Thickness', 'Summary', 'Final']}
        />

        <div className="sketch-checklist-content">
          <h1 className="font-roboto" style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Design services
          </h1>

          <div className="sketch-checklist-card">
            <h2 className="checklist-title font-roboto">
              Before you upload, make sure your sketch meets our requirements
            </h2>

            <div className="checklist-content-grid">
              <div className="sketch-example-container">
                <img 
                  src="https://res.cloudinary.com/dghus7hyd/image/upload/v1764959027/sketch_vfp5pl.png" 
                  alt="Example sketch with dimensions" 
                  className="sketch-example-image"
                />
              </div>

              <div className="checklist-items">
                <div 
                  className={`checklist-item ${checks.clearlySketch ? 'checked' : ''}`}
                  onClick={() => handleCheckChange('clearlySketch')}
                >
                  <Checkbox 
                    checked={checks.clearlySketch}
                    onCheckedChange={() => handleCheckChange('clearlySketch')}
                  />
                  <p className="checklist-item-text font-roboto">
                    My image is <strong>clearly sketched</strong>, preferably on graph paper
                  </p>
                </div>

                <div 
                  className={`checklist-item ${checks.visibleDimensions ? 'checked' : ''}`}
                  onClick={() => handleCheckChange('visibleDimensions')}
                >
                  <Checkbox 
                    checked={checks.visibleDimensions}
                    onCheckedChange={() => handleCheckChange('visibleDimensions')}
                  />
                  <p className="checklist-item-text font-roboto">
                    My lines and dimensions are <strong>visible and easy to read</strong> (not blurry)
                  </p>
                </div>

                <div 
                  className={`checklist-item ${checks.allCallouts ? 'checked' : ''}`}
                  onClick={() => handleCheckChange('allCallouts')}
                >
                  <Checkbox 
                    checked={checks.allCallouts}
                    onCheckedChange={() => handleCheckChange('allCallouts')}
                  />
                  <p className="checklist-item-text font-roboto">
                    I have included callouts and dimensions for <strong>every feature</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="checklist-footer">
              <button 
                className="guidelines-link font-roboto" 
                onClick={() => {
                  window.open('https://blog.sheetcutters.com', '_blank');
                }}
              >
                VIEW DESIGN SERVICE GUIDELINES →
              </button>

              <div className="footer-buttons">
                <button className="cancel-btn font-roboto" onClick={onCancel}>
                  CANCEL
                </button>
                <button className="back-btn font-roboto" onClick={onBack}>
                  BACK
                </button>
                <button 
                  className="next-btn font-roboto" 
                  onClick={onNext}
                  disabled={!allChecked}
                >
                  NEXT
                </button>
              </div>
            </div>

            {/* WhatsApp Contact Link */}
            <div className="text-center mt-6">
              <WhatsAppContactLink />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}