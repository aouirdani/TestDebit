'use client';

import {
  Activity,
  Download,
  Gauge,
  History as HistoryIcon,
  Loader2,
  Moon,
  RefreshCcw,
  Sun,
  Upload,
  Wifi
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ResultCard from '@/components/ResultCard';
import {
  SpeedTestHistoryEntry,
  SpeedTestPhase,
  SpeedTestResult,
  getIspInformation,
  runSpeedTest
} from '@/lib/speedtest';

const HISTORY_STORAGE_KEY = 'cf-speedtest-history';
const THEME_STORAGE_KEY = 'cf-speedtest-theme';

const phaseLabel: Record<SpeedTestPhase, string> = {
  idle: 'Waiting to start',
  latency: 'Measuring latency',
  download: 'Testing download',
  upload: 'Testing upload',
  completed: 'Test complete',
  error: 'Something went wrong'
};

type ThemeMode = 'light' | 'dark';

const loadStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? null;
};

const persistTheme = (mode: ThemeMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
};

const applyThemeClass = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('light', mode === 'light');
};

export default function SpeedTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<SpeedTestPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SpeedTestHistoryEntry[]>([]);
  const [isp, setIsp] = useState<string | undefined>();
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as SpeedTestHistoryEntry[];
        setHistory(parsed);
      } catch (storageError) {
        console.warn('Unable to parse stored history', storageError);
      }
    }

    const storedTheme = loadStoredTheme();
    const preferred: ThemeMode = storedTheme
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    setTheme(preferred);
    applyThemeClass(preferred);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (!loadStoredTheme()) {
        const nextMode: ThemeMode = event.matches ? 'dark' : 'light';
        setTheme(nextMode);
        applyThemeClass(nextMode);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getIspInformation().then((value) => {
      if (isMounted) {
        setIsp(value);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyThemeClass(next);
      persistTheme(next);
      return next;
    });
  }, []);

  const persistHistory = useCallback((entries: SpeedTestHistoryEntry[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  }, []);

  const startTest = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setPhase('latency');
    setProgress(0);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const testResult = await runSpeedTest({
        enableUpload: true,
        signal: controller.signal,
        onProgress: (nextProgress, nextPhase) => {
          setProgress(Math.round(nextProgress));
          setPhase(nextPhase);
        }
      });

      setResult(testResult);
      setPhase('completed');
      setProgress(100);

      const entry: SpeedTestHistoryEntry = {
        ...testResult,
        isp
      };
      setHistory((prev) => {
        const nextHistory = [entry, ...prev].slice(0, 5);
        persistHistory(nextHistory);
        return nextHistory;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError(null);
        setPhase('idle');
        setProgress(0);
      } else {
        console.error(err);
        setError('Unable to complete the speed test. Please check your connection and try again.');
        setPhase('error');
        setProgress(0);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [isRunning, isp, persistHistory]);

  const cancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setPhase('idle');
    setProgress(0);
  }, []);

  const themeIcon = theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />;

  const formattedHistory = useMemo(
    () =>
      history.map((entry) => ({
        ...entry,
        date: new Date(entry.timestamp)
      })),
    [history]
  );

  const activeResult = result ?? history.at(0) ?? null;

  return (
    <section className="relative">
      <div className="glass glass-light relative overflow-hidden p-6 shadow-2xl md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="pulse-slow absolute -left-56 -top-56 h-96 w-96 rounded-full bg-gradient-radial from-sky-500/20 via-sky-500/10 to-transparent blur-3xl" />
          <div className="pulse-slow absolute -bottom-80 right-0 h-[28rem] w-[28rem] rounded-full bg-gradient-conic from-violet-500/40 via-sky-400/20 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Wifi className="h-8 w-8 text-sky-400" />
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
                  Cloudflare Speed Test
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300/80">
                Measure download, upload, latency, and jitter using Cloudflare&apos;s global CDN endpoints. Optimized for Vercel with instant feedback and run history.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end md:self-center">
              {isp ? (
                <span className="hidden rounded-full border border-white/20 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur-md dark:bg-white/10 dark:text-slate-200 md:inline-flex">
                  ISP · {isp}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleThemeToggle}
                className="glass glass-light flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/40 text-slate-700 transition hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-slate-200"
                aria-label="Toggle theme"
              >
                {themeIcon}
              </button>
            </div>
          </header>

          <div className="relative z-10 mt-4 flex flex-col items-center justify-center gap-8 md:flex-row md:items-stretch">
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/40 bg-white/40 backdrop-blur-2xl dark:bg-white/10"
                  animate={{ rotate: isRunning ? 360 : 0 }}
                  transition={{ repeat: isRunning ? Infinity : 0, duration: 14, ease: 'linear' }}
                />
                <svg className="relative h-60 w-60" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="14"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="url(#progressGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    fill="transparent"
                    initial={{ strokeDashoffset: 502 }}
                    animate={{ strokeDashoffset: 502 - (502 * progress) / 100 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    strokeDasharray="502"
                  />
                  <text
                    x="50%"
                    y="52%"
                    textAnchor="middle"
                    fontSize="44"
                    fontWeight="600"
                    fill="currentColor"
                    className="text-slate-900 dark:text-slate-100"
                  >
                    {progress}
                  </text>
                  <text
                    x="50%"
                    y="68%"
                    textAnchor="middle"
                    fontSize="18"
                    fill="currentColor"
                    className="text-slate-500 dark:text-slate-300"
                  >
                    %
                  </text>
                </svg>
                <motion.div
                  className="absolute bottom-6 rounded-full border border-white/30 bg-white/60 px-4 py-1 text-xs font-medium text-slate-700/80 backdrop-blur dark:bg-white/10 dark:text-slate-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={phase}
                >
                  {phaseLabel[phase]}
                </motion.div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={startTest}
                  disabled={isRunning}
                  className="group relative flex h-16 w-56 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-lg font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-20">
                    <div className="absolute inset-0 bg-white mix-blend-overlay" />
                  </div>
                  <motion.span
                    className="flex items-center gap-2"
                    key={isRunning ? 'running' : 'idle'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gauge className="h-5 w-5" />}
                    {isRunning ? 'Testing…' : 'Start Test'}
                  </motion.span>
                </button>
                {isRunning ? (
                  <button
                    type="button"
                    onClick={cancelTest}
                    className="flex h-12 items-center gap-2 rounded-full border border-white/40 bg-white/50 px-5 text-sm font-medium text-slate-700 shadow transition hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-slate-200"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Cancel
                  </button>
                ) : phase === 'completed' || phase === 'error' ? (
                  <button
                    type="button"
                    onClick={startTest}
                    className="flex h-12 items-center gap-2 rounded-full border border-white/40 bg-white/60 px-5 text-sm font-medium text-slate-700 shadow transition hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-slate-200"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Test Again
                  </button>
                ) : null}
              </div>

              {error ? (
                <p className="mt-2 text-center text-sm text-red-500" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 mt-12 grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
            <div className="card-grid">
              <ResultCard
                label="Download"
                value={activeResult?.downloadMbps ?? null}
                unit="Mbps"
                description="Average of multiple Cloudflare file downloads"
                icon={<Download className="h-6 w-6" />}
                isLoading={isRunning && phase === 'download'}
                accentFrom="#38bdf8"
                accentTo="#6366f1"
              />
              <ResultCard
                label="Upload"
                value={activeResult?.uploadMbps ?? null}
                unit="Mbps"
                description="Measured via Cloudflare upload endpoint"
                icon={<Upload className="h-6 w-6" />}
                isLoading={isRunning && phase === 'upload'}
                accentFrom="#22d3ee"
                accentTo="#6366f1"
              />
              <ResultCard
                label="Ping"
                value={activeResult?.latency?.average ?? null}
                unit="ms"
                description="Round-trip time to the nearest Cloudflare edge"
                icon={<Activity className="h-6 w-6" />}
                isLoading={isRunning && phase === 'latency'}
                accentFrom="#818cf8"
                accentTo="#a855f7"
              />
              <ResultCard
                label="Jitter"
                value={activeResult?.latency?.jitter ?? null}
                unit="ms"
                description="Average variation across latency samples"
                icon={<Gauge className="h-6 w-6" />}
                isLoading={isRunning && phase === 'latency'}
                accentFrom="#34d399"
                accentTo="#22d3ee"
              />
            </div>

            <div className="glass glass-light flex flex-col gap-4 rounded-3xl border border-white/20 p-6 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold">Recent Tests</h2>
                </div>
                {isp ? (
                  <span className="rounded-full border border-white/20 bg-white/50 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    {isp}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <AnimatePresence initial={false}>
                  {formattedHistory.length ? (
                    formattedHistory.map((entry) => (
                      <motion.div
                        key={entry.timestamp}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/60 px-4 py-3 text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200"
                      >
                        <div>
                          <p className="font-medium">{entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {entry.date.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">↓ {entry.downloadMbps?.toFixed(1) ?? '--'} Mbps</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">↑ {entry.uploadMbps?.toFixed(1) ?? '--'} Mbps</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-dashed border-white/20 bg-white/40 px-4 py-6 text-center text-slate-500 dark:bg-white/5 dark:text-slate-400"
                    >
                      No tests yet. Kick off your first run to see history here.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
