import SpeedTest from '@/components/SpeedTest';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
      <div className="w-full max-w-5xl">
        <SpeedTest />
      </div>
    </main>
  );
}
