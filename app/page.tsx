"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Stethoscope, Users, FileText, CalendarDays, ShieldCheck, Brain,
  ClipboardList, Pill, HeartPulse, FolderOpen, BarChart3, Lock,
  UserCheck, Eye, ChevronRight, Star, Check, ArrowRight, Menu, X,
  Activity, Sparkles, Globe, Zap
} from "lucide-react"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
        ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg"
        : "bg-transparent"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Predia
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">Funcionalidades</a>
              <a href="#ai" className="text-sm text-slate-300 hover:text-white transition-colors">IA Clínica</a>
              <a href="#plans" className="text-sm text-slate-300 hover:text-white transition-colors">Planes</a>
              <a href="#security" className="text-sm text-slate-300 hover:text-white transition-colors">Seguridad</a>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Crear cuenta
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/10">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">Funcionalidades</a>
              <a href="#ai" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">IA Clínica</a>
              <a href="#plans" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">Planes</a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white py-2">Seguridad</a>
              <div className="pt-4 border-t border-white/10 space-y-3">
                <Link href="/login" className="block text-center py-2.5 text-slate-300 hover:text-white border border-white/20 rounded-xl">
                  Iniciar sesión
                </Link>
                <Link href="/login" className="block text-center py-2.5 font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl">
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center hero-gradient overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float delay-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Plataforma Clínica de Nueva Generación</span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight animate-fade-in-up delay-100">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Gestión Clínica
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                Inteligente y Segura
              </span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              Centraliza historiales clínicos, optimiza consultas y potencia tu práctica médica
              con inteligencia artificial. Todo en una sola plataforma.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Crear cuenta gratis
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold border border-white/20 hover:border-white/40 rounded-2xl transition-all duration-300 hover:bg-white/5 backdrop-blur-sm"
              >
                Iniciar sesión
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto animate-fade-in-up delay-500">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">HIPAA</div>
                <div className="text-xs text-slate-500 mt-1">Compatible</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">256-bit</div>
                <div className="text-xs text-slate-500 mt-1">Encriptación</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-xs text-slate-500 mt-1">Disponibilidad</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              <span>Plataforma Completa</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Todo lo que necesitas para tu
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> práctica clínica</span>
            </h2>
            <p className="text-lg text-slate-400">
              Un sistema integral diseñado por profesionales de la salud, para profesionales de la salud.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Gestión de Pacientes",
                description: "Registro completo, búsqueda avanzada y seguimiento integral de cada paciente con ficha clínica detallada.",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: FileText,
                title: "Historial Clínico",
                description: "Historial médico centralizado con antecedentes, alergias, patologías, vacunas y evolución clínica completa.",
                color: "from-emerald-500 to-emerald-600"
              },
              {
                icon: ClipboardList,
                title: "Consultas Médicas",
                description: "Registro estructurado de consultas con notas SOAP, exploración física y plan de tratamiento.",
                color: "from-purple-500 to-purple-600"
              },
              {
                icon: Pill,
                title: "Recetas Electrónicas",
                description: "Generación de recetas digitales con catálogo de medicamentos, dosis e indicaciones personalizadas.",
                color: "from-pink-500 to-pink-600"
              },
              {
                icon: HeartPulse,
                title: "Signos Vitales",
                description: "Registro y monitoreo de signos vitales con gráficas de tendencia y alertas automáticas por valores anormales.",
                color: "from-red-500 to-red-600"
              },
              {
                icon: FolderOpen,
                title: "Documentos Médicos",
                description: "Gestión de estudios, imágenes diagnósticas y documentos clínicos adjuntos al expediente del paciente.",
                color: "from-amber-500 to-amber-600"
              },
              {
                icon: CalendarDays,
                title: "Agenda Médica",
                description: "Calendario de citas inteligente con recordatorios, gestión de horarios y vista por médico o especialidad.",
                color: "from-cyan-500 to-cyan-600"
              },
              {
                icon: ShieldCheck,
                title: "Seguridad y Auditoría",
                description: "Registro completo de actividades, control de acceso por roles y trazabilidad de cada operación clínica.",
                color: "from-slate-500 to-slate-600"
              },
              {
                icon: Brain,
                title: "IA de Apoyo Médico",
                description: "Módulos predictivos con inteligencia artificial para apoyo en la toma de decisiones clínicas informadas.",
                color: "from-violet-500 to-violet-600"
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 hover:border-white/10 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== AI SECTION ========== */}
      <section id="ai" className="relative py-24 lg:py-32 section-gradient-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
                <Brain className="w-4 h-4" />
                <span>Inteligencia Artificial Clínica</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                IA que apoya tus
                <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> decisiones clínicas</span>
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Módulos predictivos avanzados que analizan datos clínicos para identificar
                factores de riesgo y generar alertas tempranas. La IA no reemplaza al médico:
                potencia su criterio con datos.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Predicción de Diabetes</h3>
                    <p className="text-sm text-slate-400">Primer módulo activo. Analiza factores de riesgo clínicos y biométricos para evaluar probabilidad de desarrollo de diabetes tipo 2.</p>
                    <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <Zap className="w-3 h-3 mr-1" /> Disponible ahora
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-4 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HeartPulse className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Riesgo Cardiovascular</h3>
                    <p className="text-sm text-slate-400">Evaluación predictiva de riesgo cardiovascular basada en perfil clínico integral.</p>
                    <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                      Próximamente
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-4 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Síndrome Metabólico</h3>
                    <p className="text-sm text-slate-400">Análisis integral de factores metabólicos para detección temprana de riesgos combinados.</p>
                    <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                      Próximamente
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="ml-4 text-xs text-slate-500 font-mono">medicore / ia-predictiva</span>
                  </div>

                  {/* Simulated AI output */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-xs text-slate-500 mb-2 font-mono">Análisis de Riesgo</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Factores evaluados</span>
                        <span className="text-sm font-semibold text-blue-400">8 / 8</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-2xl font-bold text-emerald-400">97.8%</div>
                        <div className="text-xs text-slate-500 mt-1">Precisión del modelo</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-2xl font-bold text-amber-400">Moderado</div>
                        <div className="text-xs text-slate-500 mt-1">Nivel de riesgo</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-start space-x-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-emerald-300 font-medium">Herramienta de apoyo</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Los resultados son orientativos. Toda decisión médica debe ser tomada por un profesional calificado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PLANS SECTION ========== */}
      <section id="plans" className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              <span>Planes de Suscripción</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              El plan perfecto para tu
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> práctica médica</span>
            </h2>
            <p className="text-lg text-slate-400">
              Escala tu suscripción según las necesidades de tu clínica. Sin compromisos a largo plazo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Básico</h3>
                <p className="text-sm text-slate-400">Para profesionales independientes</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-white">Gratis</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Gestión de pacientes",
                  "Historial clínico básico",
                  "Agenda de citas",
                  "Hasta 50 pacientes",
                  "1 usuario"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all duration-300"
              >
                Comenzar gratis
              </Link>
            </div>

            {/* Professional Plan */}
            <div className="relative rounded-2xl border-2 border-blue-500/50 bg-blue-500/[0.05] p-8 shadow-2xl shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 scale-[1.03]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-xs font-semibold text-white shadow-lg">
                Más popular
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Profesional</h3>
                <p className="text-sm text-slate-400">Para consultorios y clínicas</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-white">$499</span>
                  <span className="text-slate-400 ml-2">MXN/mes</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Todo del plan Básico",
                  "Consultas y notas SOAP",
                  "Recetas electrónicas",
                  "Documentos médicos",
                  "Dashboard clínico avanzado",
                  "Pacientes ilimitados",
                  "Hasta 5 usuarios"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 shadow-lg shadow-blue-500/25"
              >
                Comenzar ahora
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
                <p className="text-sm text-slate-400">Para clínicas con IA avanzada</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-white">$999</span>
                  <span className="text-slate-400 ml-2">MXN/mes</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Todo del plan Profesional",
                  "Módulos de IA predictiva",
                  "Predicción de diabetes",
                  "Analítica avanzada",
                  "Auditoría completa",
                  "Soporte prioritario",
                  "Usuarios ilimitados"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-slate-300">
                    <Check className="w-4 h-4 text-violet-400 mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center py-3 rounded-xl border border-violet-500/30 text-white font-medium hover:bg-violet-500/10 transition-all duration-300"
              >
                Contactar ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECURITY SECTION ========== */}
      <section id="security" className="relative py-24 lg:py-32 section-gradient-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, title: "Autenticación JWT", desc: "Tokens seguros con expiración y renovación automática", color: "from-blue-500 to-blue-600" },
                  { icon: UserCheck, title: "Control por Roles", desc: "Admin, Médico, Enfermero con permisos granulares", color: "from-emerald-500 to-emerald-600" },
                  { icon: Eye, title: "Auditoría Total", desc: "Registro de cada acción con trazabilidad completa", color: "from-amber-500 to-amber-600" },
                  { icon: ShieldCheck, title: "Confidencialidad", desc: "Datos encriptados en tránsito y en reposo", color: "from-violet-500 to-violet-600" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 hover:border-white/10"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-6">
                <ShieldCheck className="w-4 h-4" />
                <span>Seguridad y Cumplimiento</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                La seguridad de tus pacientes es
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"> nuestra prioridad</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                Cada dato clínico es tratado con los más altos estándares de seguridad.
                Control de acceso granular, auditoría completa y encriptación de extremo
                a extremo para garantizar la confidencialidad médica.
              </p>
              <div className="flex flex-wrap gap-3">
                {["JWT", "bcrypt", "RBAC", "Audit Log", "HTTPS", "Rate Limiting"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 lg:p-16">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-violet-500/20 rounded-3xl" />
            <div className="absolute inset-0 border border-white/10 rounded-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Comienza a transformar tu práctica clínica hoy
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                Únete a los profesionales de la salud que ya confían en Predia para gestionar
                sus historiales clínicos de forma inteligente y segura.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
                >
                  Crear cuenta gratis
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center space-x-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Predia</span>
              </Link>
              <p className="text-sm text-slate-500 leading-relaxed">
                Plataforma clínica integral con inteligencia artificial para la gestión eficiente de historiales médicos.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Plataforma</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Funcionalidades</a></li>
                <li><a href="#ai" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">IA Clínica</a></li>
                <li><a href="#plans" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Planes</a></li>
                <li><a href="#security" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Seguridad</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Acceso</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Iniciar sesión</Link></li>
                <li><Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Crear cuenta</Link></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Documentación</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contacto</h4>
              <ul className="space-y-3">
                <li><a href="mailto:soporte@medicore.mx" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">soporte@medicore.mx</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Centro de ayuda</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Términos de servicio</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} Predia. Todos los derechos reservados.
            </p>
            <p className="text-xs text-slate-700 mt-2 md:mt-0">
              Plataforma de apoyo clínico — No sustituye el criterio médico profesional
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
