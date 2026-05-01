import { Home } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export function NotFoundPage({ onGoHome }: NotFoundPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dc0000] via-[#ff4444] to-[#ff6b6b] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 border-4 border-white rotate-12"></div>
        <div className="absolute bottom-40 left-1/4 w-24 h-24 border-4 border-white rounded-full"></div>
        <div className="absolute top-1/3 right-20 w-40 h-40 border-4 border-white -rotate-6"></div>
        <div className="absolute bottom-20 right-1/3 w-16 h-16 border-4 border-white rotate-45"></div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-6xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Left side - Text content */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="space-y-6">
                  <div>
                    <h1 className="text-6xl md:text-7xl mb-4 text-black">
                      Oh no,
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-700">
                      you have just stumbled on a 404,<br />
                      this page is not found.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={onGoHome}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all duration-300 group"
                    >
                      <Home className="w-5 h-5" />
                      <span>Bring me back to home</span>
                    </button>
                  </div>

                  <div className="pt-8 border-t border-gray-200">
                    <p className="text-gray-500 text-sm">
                      Looking for something specific? Try going back to the homepage and navigate from there.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Illustration */}
              <div className="relative bg-gray-50 p-8 md:p-12 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  {/* Large 404 background text */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <span className="text-[200px] font-bold text-black leading-none">
                      404
                    </span>
                  </div>

                  {/* Isometric illustration placeholder */}
                  <div className="relative z-10">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1641375863453-238c8b00b867?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpc29tZXRyaWMlMjBhYnN0cmFjdCUyMGdlb21ldHJ5fGVufDF8fHx8MTc2NDg0NTQxOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Abstract 3D illustration"
                      className="w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>

                  {/* Decorative red accents */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#dc0000] opacity-80 rounded-full blur-2xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#dc0000] opacity-60 rounded-full blur-3xl"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional help section */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-6 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full">
              <a 
                href="mailto:support@sheetcutters.com" 
                className="hover:text-black transition-colors"
              >
                📧 support@sheetcutters.com
              </a>
              <span className="w-px h-6 bg-white/50"></span>
              <a 
                href="tel:+918123629917" 
                className="hover:text-black transition-colors"
              >
                📞 +91-8123629917
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
