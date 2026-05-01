import { useState } from 'react';
import { BottomNavigationBar } from './BottomNavigationBar';
import { WhatsAppContactLink } from './WhatsAppContactLink';

interface ServiceSelectionScreenProps {
  onNext: (serviceType: 'dxf' | 'sketch') => void;
  onCancel: () => void;
}

export function ServiceSelectionScreen({ onNext, onCancel }: ServiceSelectionScreenProps) {
  const [selectedService, setSelectedService] = useState<'dxf' | 'sketch' | null>(null);

  const handleNext = () => {
    if (selectedService) {
      onNext(selectedService);
    }
  };

  return (
    <>
      <style>{`
        .service-selection-container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 24px;
        }

        .service-selection-title {
          font-size: 24px;
          font-weight: 600;
          color: #e5e5e5;
          margin-bottom: 32px;
        }

        .service-selection-card {
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 48px;
          background: #1a1a1a;
        }

        .service-description {
          text-align: center;
          margin-bottom: 48px;
        }

        .service-description-text {
          font-size: 16px;
          color: #666666;
          line-height: 1.6;
          margin: 0;
        }

        .service-buttons-container {
          display: flex;
          gap: 24px;
          justify-content: center;
          margin-bottom: 32px;
        }

        .service-button {
          min-width: 220px;
          padding: 48px 32px;
          border: 0;
          border-radius: 12px;
          background: #222222;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .service-button:hover {
          border-color: #3b82f6;
        }

        .service-button.selected {
          border-color: #3b82f6;
          background: #2B2B2B;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
        }

        .service-button-title {
          font-size: 20px;
          font-weight: 500;
          color: #ffffff;
          margin: 0 0 12px 0;
        }

        .service-button.selected .service-button-title {
          color: #3b82f6;
        }

        .service-button-subtitle {
          font-size: 14px;
          color: #666666;
          margin: 0;
        }

        .service-button.selected .service-button-subtitle {
          color: #93c5fd;
        }

        .service-disclaimer {
          text-align: center;
          font-size: 12px;
          color: #666666;
          margin-bottom: 32px;
        }

        .service-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 24px;
          border-top: 1px solid #2d3748;
        }

        .service-guidelines-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 14px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }

        .service-guidelines-link:hover {
          text-decoration: underline;
        }

        .service-footer-buttons {
          display: flex;
          gap: 12px;
        }

        .service-cancel-btn {
          padding: 10px 32px;
          border: 1px solid #2d3748;
          border-radius: 4px;
          background: transparent;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .service-cancel-btn:hover {
          background: #1e293b;
        }

        .service-next-btn {
          padding: 10px 40px;
          border: none;
          border-radius: 4px;
          background: #3b82f6;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .service-next-btn:hover {
          background: #2563eb;
        }

        .service-next-btn:disabled {
          background: #1e293b;
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .service-selection-card {
            padding: 32px 24px;
            padding-bottom: 120px; /* Add extra padding at bottom to prevent overlap with nav bar */
          }

          .service-buttons-container {
            flex-direction: column;
            align-items: center;
          }

          .service-button {
            width: 100%;
            max-width: 300px;
          }

          .service-footer {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .service-footer-buttons {
            justify-content: stretch;
          }

          .service-cancel-btn,
          .service-next-btn {
            flex: 1;
            padding-left: 8px;
            padding-right: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      `}</style>

      <div className="service-selection-container px-[24px] py-[0px] mx-[0px] my-[40px] pb-32">
        <h1 className="service-selection-title mt-[-15px] mr-[0px] mb-[27px] ml-[0px]">Select Design Service</h1>

        <div className="service-selection-card p-[48px] mx-[0px] my-[-21px]">
          <div className="service-description">
            <p className="service-description-text font-roboto">
              If you have a DXF file, upload it here,<span className="text-[14px] text-[13px]"><br /> Or you can send us a sketch or a template, <br />Our design service team will convert it<br />
              to CAD for ₹150 and send you a cart link to purchase your part.</span>
            </p>
          </div>

          <div className="service-buttons-container mt-[-31px] mr-[0px] mb-[32px] ml-[0px]">
            <button 
              className={`service-button ${selectedService === 'sketch' ? 'selected' : ''}`}
              onClick={() => setSelectedService('sketch')}
            >
              <p className="service-button-title font-roboto">Convert Sketch</p>
              <p className="service-button-subtitle font-roboto">
                Hand Drawn Sketch with<br />
                dimensions and callouts
              </p>
            </button>

            <button
              className={`service-button ${selectedService === 'dxf' ? 'selected' : ''}`}
              onClick={() => setSelectedService('dxf')}
            >
              <p className="service-button-title font-roboto">Upload DXF</p>
            </button>
          </div>

          <div className="service-disclaimer font-roboto">
            * ₹150 is only for converting sketch to Full Cad DXF. Extra charges for laser cutting may apply
          </div>

          <div className="text-center pt-6 border-t border-gray-800">
            <button className="service-guidelines-link font-roboto" onClick={() => {
              window.open('https://blog.sheetcutters.com', '_blank');
            }}>
              View Sketch Guidelines
            </button>
          </div>

          {/* WhatsApp Contact Link */}
          <div className="text-center mt-6">
            <WhatsAppContactLink />
          </div>
        </div>
      </div>

      <BottomNavigationBar
        onBack={onCancel}
        onNext={handleNext}
        nextLabel="Next"
        nextDisabled={!selectedService}
      />
    </>
  );
}