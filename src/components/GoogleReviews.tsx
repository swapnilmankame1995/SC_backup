import { useEffect, useState } from 'react';
import { Star, ExternalLink } from 'lucide-react';
import { apiCall } from '../utils/api';

interface Review {
  author: string;
  rating: number;
  text: string;
  time: number;
  profilePhoto: string;
  relativeTime: string;
}

interface ReviewsData {
  name: string;
  rating: number;
  totalRatings: number;
  reviews: Review[];
}

export function GoogleReviews() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/google-reviews');
      
      if (result.success) {
        setReviewsData(result.data);
        setError(null);
      } else {
        // Only set error if it's not a network issue
        setError(result.error || 'Failed to load reviews');
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      // Don't show error to user for network failures - just fail silently
      // This prevents showing errors on initial page load when server is warming up
      if (!err.message?.includes('Failed to fetch')) {
        setError(err.message || 'Failed to load reviews');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'fill-[#dc0000] text-[#dc0000]' : 'text-gray-600'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="bg-black py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#dc0000] mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading reviews...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-black py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">{error}</p>
        </div>
      </section>
    );
  }

  if (!reviewsData || !reviewsData.reviews.length) {
    return null;
  }

  return (
    <section className="bg-black py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl text-white mb-4 font-[Poppins] font-light">
            What Our Customers Say
          </h2>
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="flex gap-1">
              {renderStars(Math.round(reviewsData.rating))}
            </div>
            <span className="text-2xl text-white font-semibold">
              {reviewsData.rating.toFixed(1)}
            </span>
          </div>
          <p className="text-gray-400">
            Based on {reviewsData.totalRatings} reviews
          </p>
          <a
            href={`https://search.google.com/local/writereview?placeid=${reviewsData.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-[#dc0000] hover:text-[#b80000] transition-colors"
          >
            <span>Leave a review on Google</span>
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviewsData.reviews.map((review, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-5 border border-white border-opacity-10 rounded-lg p-6 hover:bg-opacity-10 hover:border-[#dc0000] transition-all"
            >
              {/* Author & Rating */}
              <div className="flex items-start gap-3 mb-4">
                {review.profilePhoto && (
                  <img
                    src={review.profilePhoto}
                    alt={review.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">
                    {review.author}
                  </h3>
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-4">
                {review.text}
              </p>

              {/* Time */}
              <p className="text-gray-500 text-xs">
                {review.relativeTime}
              </p>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <a
            href="https://www.google.com/maps/search/?api=1&query=SheetCutters"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#dc0000] hover:bg-[#b80000] text-white px-8 py-3 rounded-lg transition-colors font-medium"
          >
            <span>View All Reviews on Google</span>
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}