'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UnpaydLogo, UnpaydIcon } from '@/components/ui/logo';
import {
  MessageSquare,
  Code,
  Brain,
  Zap,
  Globe,
  Mic,
  FileUp,
  Lock,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      {/* Animated particles - using deterministic positions to avoid hydration mismatch */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[
          { left: '10%', top: '20%', delay: '0s', duration: '4s' },
          { left: '25%', top: '45%', delay: '0.5s', duration: '3.5s' },
          { left: '40%', top: '15%', delay: '1s', duration: '4.5s' },
          { left: '55%', top: '70%', delay: '1.5s', duration: '3s' },
          { left: '70%', top: '35%', delay: '2s', duration: '5s' },
          { left: '85%', top: '60%', delay: '0.3s', duration: '4s' },
          { left: '15%', top: '80%', delay: '0.8s', duration: '3.8s' },
          { left: '30%', top: '10%', delay: '1.2s', duration: '4.2s' },
          { left: '60%', top: '85%', delay: '0.6s', duration: '3.6s' },
          { left: '90%', top: '25%', delay: '1.8s', duration: '4.8s' },
          { left: '5%', top: '55%', delay: '2.2s', duration: '3.2s' },
          { left: '45%', top: '40%', delay: '0.4s', duration: '4.4s' },
          { left: '75%', top: '5%', delay: '1.4s', duration: '3.4s' },
          { left: '20%', top: '90%', delay: '2.5s', duration: '5s' },
          { left: '95%', top: '50%', delay: '0.7s', duration: '3.7s' },
        ].map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <UnpaydLogo size="sm" showText={true} />
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="bg-white text-black hover:bg-zinc-200">
                <Link href="/chat">
                  Open App
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-zinc-400 hover:text-white">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="bg-white text-black hover:bg-zinc-200">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-6 pt-20 pb-32 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-zinc-400">100% Free • No Credit Card Required</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              Your Free AI
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Assistant
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
            A beautiful, fast, and completely free AI chat experience.
            Powered by the best open-source models, available on all your devices.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              asChild
              size="lg"
              className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-xl"
            >
              <Link href={isAuthenticated ? '/chat' : '/signup'}>
                Start Chatting Free
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-900 text-lg px-8 py-6 rounded-xl"
            >
              <Link href="#features">
                See Features
              </Link>
            </Button>
          </div>

          {/* Model showcase */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Zap, name: 'Quick', desc: 'Fast responses', color: 'from-yellow-500 to-orange-500' },
              { icon: MessageSquare, name: 'General', desc: 'Everyday chat', color: 'from-blue-500 to-cyan-500' },
              { icon: Code, name: 'Coding', desc: 'Programming help', color: 'from-green-500 to-emerald-500' },
              { icon: Brain, name: 'Deep Think', desc: 'Complex reasoning', color: 'from-purple-500 to-pink-500' },
            ].map((model) => (
              <div
                key={model.name}
                className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-105"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center mb-3 mx-auto`}>
                  <model.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{model.name}</h3>
                <p className="text-sm text-zinc-500">{model.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Premium features, completely free. No hidden costs, no usage limits.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: 'Web Search',
                description: 'Access real-time information from the internet for up-to-date answers.',
              },
              {
                icon: FileUp,
                title: 'File & Image Upload',
                description: 'Drop files and images directly into your chat for analysis.',
              },
              {
                icon: Mic,
                title: 'Voice Input',
                description: 'Speak naturally and let AI understand your voice.',
              },
              {
                icon: Lock,
                title: 'Secure & Private',
                description: 'Your conversations are encrypted and never used for training.',
              },
              {
                icon: Sparkles,
                title: 'Multiple AI Models',
                description: 'Choose the right model for your task - coding, reasoning, or quick answers.',
              },
              {
                icon: MessageSquare,
                title: 'Chat History',
                description: 'All your conversations saved and searchable. Archive when needed.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
                  <feature.icon className="w-6 h-6 text-zinc-300" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-24 max-w-7xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                Join thousands of users already chatting with Unpayd.
                Create your free account in seconds.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-xl"
              >
                <Link href={isAuthenticated ? '/chat' : '/signup'}>
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-zinc-900">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-zinc-500">Unpayd</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span>© {new Date().getFullYear()} Unpayd</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
