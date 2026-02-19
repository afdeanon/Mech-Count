import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Layout/Header';
import { AuthModal } from '@/components/Auth/AuthModal';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function Landing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLoginClick = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleSignUpClick = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header 
        showAuthButtons 
        onLoginClick={handleLoginClick}
        onSignUpClick={handleSignUpClick}
      />

      {/* Hero Section */}
      <main className="container mx-auto px-4 pt-28 md:pt-32 pb-20 md:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Count Mechanical Symbols
              <span className="block text-gradient">with AI Precision</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload, analyze, and manage mechanical blueprint data
              with an AI-assisted estimation dashboard.
            </p>

            <Button 
              size="lg" 
              onClick={handleSignUpClick}
              className="btn-tech h-14 px-8 text-lg gap-3 animate-scale-in"
            >
              Start Counting
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Demo Image */}
          <div className="mt-12 md:mt-16 animate-slide-up">
            <div className="glass-card p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
              <img
                src="/blueprint-detections.png"
                alt="Mechanical blueprint analysis with detected symbols"
                className="w-full h-auto max-h-[45vh] sm:max-h-[52vh] md:max-h-[60vh] lg:max-h-[64vh] rounded-lg shadow-medium object-contain"
              />
              <div className="flex items-center justify-center gap-8 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>11 symbols detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>96% accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>10.3s processing time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="glass-card p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join engineering teams who trust MechCount for accurate blueprint analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleSignUpClick}
                className="btn-tech h-12 px-6"
              >
                Get Started Free
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleLoginClick}
                className="btn-outline-tech h-12 px-6"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
