import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Layout/Header';
import { AuthModal } from '@/components/Auth/AuthModal';
import { ArrowRight, CheckCircle, Zap, Shield, BarChart3 } from 'lucide-react';

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

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Detection',
      description: 'Advanced computer vision algorithms detect mechanical symbols with 95%+ accuracy'
    },
    {
      icon: BarChart3,
      title: 'Detailed Analytics',
      description: 'Get comprehensive analysis with symbol counts, accuracy metrics, and insights'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your blueprints are processed securely with enterprise-grade privacy protection'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header 
        showAuthButtons 
        onLoginClick={handleLoginClick}
        onSignUpClick={handleSignUpClick}
      />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Count Mechanical Symbols
              <span className="block text-gradient">with AI Precision</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload your engineering blueprints and let our advanced computer vision 
              technology automatically detect, count, and analyze mechanical symbols 
              with professional accuracy.
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
          <div className="mt-16 animate-slide-up">
            <div className="glass-card p-8 max-w-4xl mx-auto">
              <img 
                src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&h=600&fit=crop"
                alt="Blueprint Analysis Demo"
                className="w-full rounded-lg shadow-medium"
              />
              <div className="flex items-center justify-center gap-8 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>24 symbols detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>92.5% accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>3.2s processing time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose MechCount?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for engineering professionals who need accurate, 
              fast, and reliable blueprint analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="glass-card p-8 text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
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