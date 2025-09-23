import { useEffect, useState } from "react";

// Animated Background Component
const AnimatedBackground = () => (
  <div className="absolute inset-0">
    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
    <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
  </div>
);

// Loading Animation Component
const LoadingAnimation = () => (
  <div className="mb-8">
    <div className="flex justify-center items-center space-x-2 mb-4">
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce animation-delay-200"></div>
      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce animation-delay-400"></div>
    </div>

    {/* Progress bar */}
    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div className="bg-blue-600 h-2 rounded-full animate-progress"></div>
    </div>

    {/* Spinner */}
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  </div>
);

// Security Badge Component
const SecurityBadge = () => (
  <div className="mt-8 flex items-center justify-center text-gray-600 text-sm">
    <svg
      className="w-4 h-4 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
    Secured by Keycloak
  </div>
);

// Success Message Component
const SuccessMessage = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">Welcome!</h2>
        <p className="text-gray-700">You're successfully logged in.</p>
      </div>
    </div>
  </div>
);

// Custom Styles Component
const CustomStyles = () => (
  <style>{`
    @keyframes blob {
      0% {
        transform: translate(0px, 0px) scale(1);
      }
      33% {
        transform: translate(30px, -50px) scale(1.1);
      }
      66% {
        transform: translate(-20px, 20px) scale(0.9);
      }
      100% {
        transform: translate(0px, 0px) scale(1);
      }
    }

    @keyframes progress {
      0% {
        width: 0%;
      }
      100% {
        width: 100%;
      }
    }

    @keyframes fade-in {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-blob {
      animation: blob 7s infinite;
    }

    .animation-delay-2000 {
      animation-delay: 2s;
    }

    .animation-delay-4000 {
      animation-delay: 4s;
    }

    .animation-delay-200 {
      animation-delay: 0.2s;
    }

    .animation-delay-400 {
      animation-delay: 0.4s;
    }

    .animate-progress {
      animation: progress 3s ease-in-out infinite;
    }

    .animate-fade-in {
      animation: fade-in 0.6s ease-out;
    }
  `}</style>
);

// Main Keycloak Loading Page Component
export default function LoginLoader() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate authentication process
    setTimeout(() => {
      setAuthenticated(true);
      setLoading(false);
    }, 3000); // Demo delay
  }, []);

  if (authenticated) {
    return <SuccessMessage />;
  }

  return (
    <>
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <AnimatedBackground />

        {/* Main content */}
        <div className="relative z-10 text-center px-4">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-200 max-w-md mx-auto">
            {/* Logo/Icon */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-black mb-2">
                Secure Login
              </h1>
              <p className="text-gray-600 text-lg">Connecting to Keycloak...</p>
            </div>

            <LoadingAnimation />

            {/* Status message */}
            <div className="text-center">
              <p className="text-black mb-2">Authenticating your credentials</p>
              <p className="text-gray-500 text-sm">
                Please wait while we verify your identity...
              </p>
            </div>

            <SecurityBadge />
          </div>
        </div>
      </div>
      <CustomStyles />
    </>
  );
}
