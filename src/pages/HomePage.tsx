import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart2, LineChart, Clock, Award, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const HomePage: React.FC = () => {
  const { isDarkMode } = useAppContext();
  const navigate = useNavigate();
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const fullText = 'MarketPulse';

  // Typing effect
  useEffect(() => {
    setDisplayedText('');
    setIsTypingComplete(false);
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        setIsTypingComplete(true);
        clearInterval(typingInterval);
      }
    }, 150);

    return () => clearInterval(typingInterval);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section with Typing Effect */}
      <div className="text-center mb-12 animate-fadeIn">
        <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome to <span className="text-emerald-500">{displayedText}</span>
          {!isTypingComplete && <span className="animate-blink text-emerald-500">|</span>}
        </h1>
        <p className={`text-xl max-w-3xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Your platform for algorithmic trading in NSE and BSE markets with powerful
          backtesting and predictive analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Get Started Card with Hover Effects */}
        <div
          className={`p-8 rounded-lg transition-all duration-500 scroll-animate opacity-0 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'
          } hover:shadow-emerald-500/20 hover:shadow-2xl hover:-translate-y-1`}
          style={{ '--slide-direction': '-30px' } as React.CSSProperties}
        >
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Get Started
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Start your algorithmic trading journey in just a few simple steps.
          </p>
          <div className="space-y-4">
            {[
              { title: 'Select Stocks', desc: 'Choose from a wide range of NSE and BSE listed stocks.' },
              { title: 'Choose Strategy', desc: 'Select from pre-built strategies or customize your own.' },
              { title: 'Backtest', desc: 'Test your strategy using historical market data.' },
              { title: 'Deploy', desc: 'Implement your strategy for real-time market trading.' }
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start group cursor-pointer"
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 group-hover:bg-emerald-600' : 'bg-emerald-100 group-hover:bg-emerald-600'
                  } group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/50`}
                >
                  <span className={`text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-white' : 'text-emerald-700 group-hover:text-white'
                  }`}>{i + 1}</span>
                </div>
                <div className="ml-4 group-hover:translate-x-1 transition-transform duration-300">
                  <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {step.title}
                  </h3>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/stocks')}
            className={`mt-8 px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center group ${
              isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } hover:shadow-lg hover:shadow-emerald-500/50 hover:scale-105`}
          >
            Start Trading
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Market Insights Card with Animated Chart */}
        <div
          className={`p-8 rounded-lg relative overflow-hidden transition-all duration-500 scroll-animate opacity-0 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'
          } hover:shadow-emerald-500/20 hover:shadow-2xl hover:-translate-y-1`}
          style={{ '--slide-direction': '30px' } as React.CSSProperties}
        >
          <div className="relative z-10">
            <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Market Insights
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Today's market overview and key insights.
            </p>
            <div className="space-y-4">
              {/* NIFTY 50 */}
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} hover:bg-opacity-80 transition-all cursor-pointer`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>NIFTY 50</span>
                  <span className="text-emerald-500 font-medium animate-pulse">+1.2%</span>
                </div>
                <div className="h-10 w-full bg-gray-600 rounded-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 chart-bar" style={{ width: '72%' }}></div>
                </div>
              </div>

              {/* SENSEX */}
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} hover:bg-opacity-80 transition-all cursor-pointer`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>SENSEX</span>
                  <span className="text-emerald-500 font-medium animate-pulse" style={{ animationDelay: '0.2s' }}>+0.9%</span>
                </div>
                <div className="h-10 w-full bg-gray-600 rounded-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 chart-bar" style={{ width: '68%', animationDelay: '0.3s' }}></div>
                </div>
              </div>

              {/* Top Gainers */}
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top Gainers</span>
                </div>
                <div className="space-y-2">
                  {['RELIANCE', 'TATASTEEL'].map((stock, i) => (
                    <div
                      key={stock}
                      className="flex justify-between items-center hover:translate-x-1 transition-transform cursor-pointer"
                    >
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stock}</span>
                      <span className="text-emerald-500">{i === 0 ? '+2.3%' : '+1.8%'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className={`mt-6 px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center group ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } hover:shadow-lg hover:scale-105`}
            >
              View Full Dashboard
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="absolute right-0 bottom-0 transform translate-x-1/4 translate-y-1/4 opacity-5 animate-float">
            <TrendingUp size={240} />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-16 scroll-animate opacity-0">
        <h2 className={`text-2xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: TrendingUp, title: 'Advanced Stock Screening', desc: 'Filter stocks based on various technical and fundamental parameters.', color: 'blue' },
            { icon: BarChart2, title: 'Comprehensive Backtesting', desc: 'Test your strategies against historical data with detailed performance metrics.', color: 'purple' },
            { icon: LineChart, title: 'Predictive Analytics', desc: 'Get future price predictions based on advanced machine learning models.', color: 'green' },
            { icon: Clock, title: 'Automated Trading', desc: 'Set up and deploy algorithmic trading strategies with customizable parameters.', color: 'amber' }
          ].map((feature, i) => (
            <div
              key={i}
              className={`p-6 rounded-lg text-center transition-all duration-500 cursor-pointer group ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white shadow-md hover:shadow-xl'
              } hover:-translate-y-2 hover:shadow-emerald-500/20`}
            >
              <div className="flex justify-center mb-4">
                <div className={`p-3 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-${feature.color}-500/50 ${
                  isDarkMode ? `bg-${feature.color}-900` : `bg-${feature.color}-100`
                }`}>
                  <feature.icon size={24} className={`${isDarkMode ? `text-${feature.color}-400` : `text-${feature.color}-600`} group-hover:animate-bounce`} />
                </div>
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className={`rounded-lg p-8 mb-16 transition-all duration-500 scroll-animate opacity-0 hover:shadow-2xl hover:shadow-emerald-500/20 ${
        isDarkMode ? 'bg-gray-800' : 'bg-emerald-50'
      }`}>
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-6 md:mb-0 md:mr-8 flex-shrink-0 animate-float">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
              isDarkMode ? 'bg-emerald-700' : 'bg-emerald-200'
            }`}>
              <Award size={32} className={`${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} animate-pulse`} />
            </div>
          </div>
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Ready to upgrade your trading strategy?
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              MarketPulse provides you with the tools to make data-driven trading decisions.
              Get started today and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/stocks')}
                className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center group ${
                  isDarkMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } hover:shadow-lg hover:shadow-emerald-500/50 hover:scale-105`}
              >
                Start Trading
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className={`px-6 py-3 rounded-md font-medium transition-all duration-300 hover:scale-105 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white hover:shadow-lg'
                    : 'border border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes slideInScroll {
          from {
            opacity: 0;
            transform: translateX(var(--slide-direction, 0));
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInScroll {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chartGrow {
          from { width: 0; }
          to { width: inherit; }
        }
        @keyframes float {
          0%, 100% { transform: translate(25%, 25%) translateY(0px); }
          50% { transform: translate(25%, 25%) translateY(-20px); }
        }

        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-blink { animation: blink 1s step-end infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }

        .scroll-animate.animate-in {
          animation: slideInScroll 0.8s ease-out forwards;
        }

        .scroll-animate:not([style*="--slide-direction"]).animate-in {
          animation: fadeInScroll 0.8s ease-out forwards;
        }

        .animate-in .chart-bar {
          animation: chartGrow 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
