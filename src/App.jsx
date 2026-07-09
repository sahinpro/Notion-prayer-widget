import PrayerTimesWidget from "./PrayerTimesWidget";

export default function App() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-transparent">
      <div className="relative z-10 w-full px-3 py-3 sm:px-4">
        <PrayerTimesWidget />
      </div>
    </main>
  );
}

