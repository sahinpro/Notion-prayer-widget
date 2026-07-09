import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  MapPin,
  Moon,
  Settings,
  Sun,
  Sunrise,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MosqueIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.5 10.5V21h11v-10.5M6.5 10.5L12 3l5.5 7.5M6.5 10.5h11M2 10l1.5-2L5 10v11H2V10zm15 0l1.5-2L20 10v11h-3V10z" />
    <circle cx="12" cy="5" r="1.5" />
    <path d="M12 6.5v2" />
  </svg>
);

const LOCATIONS = {
  Bangladesh: {
    Dhaka: { address: "Dhaka,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Chittagong: { address: "Chittagong,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Sylhet: { address: "Sylhet,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Sunamganj: { address: "Sunamganj,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Khulna: { address: "Khulna,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Rajshahi: { address: "Rajshahi,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Comilla: { address: "Comilla,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Rangpur: { address: "Rangpur,Bangladesh", method: 1, tz: "Asia/Dhaka" },
    Barisal: { address: "Barisal,Bangladesh", method: 1, tz: "Asia/Dhaka" },
  },
  "Saudi Arabia": {
    Mecca: { address: "Mecca,Saudi Arabia", method: 4, tz: "Asia/Riyadh" },
    Medina: { address: "Medina,Saudi Arabia", method: 4, tz: "Asia/Riyadh" },
    Riyadh: { address: "Riyadh,Saudi Arabia", method: 4, tz: "Asia/Riyadh" },
    Jeddah: { address: "Jeddah,Saudi Arabia", method: 4, tz: "Asia/Riyadh" },
    Dammam: { address: "Dammam,Saudi Arabia", method: 4, tz: "Asia/Riyadh" },
  },
  Pakistan: {
    Karachi: { address: "Karachi,Pakistan", method: 1, tz: "Asia/Karachi" },
    Lahore: { address: "Lahore,Pakistan", method: 1, tz: "Asia/Karachi" },
    Islamabad: { address: "Islamabad,Pakistan", method: 1, tz: "Asia/Karachi" },
    Peshawar: { address: "Peshawar,Pakistan", method: 1, tz: "Asia/Karachi" },
    Quetta: { address: "Quetta,Pakistan", method: 1, tz: "Asia/Karachi" },
  },
  India: {
    Delhi: { address: "Delhi,India", method: 1, tz: "Asia/Kolkata" },
    Mumbai: { address: "Mumbai,India", method: 1, tz: "Asia/Kolkata" },
    Kolkata: { address: "Kolkata,India", method: 1, tz: "Asia/Kolkata" },
    Hyderabad: { address: "Hyderabad,India", method: 1, tz: "Asia/Kolkata" },
    Lucknow: { address: "Lucknow,India", method: 1, tz: "Asia/Kolkata" },
  },
  UAE: {
    Dubai: { address: "Dubai,UAE", method: 8, tz: "Asia/Dubai" },
    "Abu Dhabi": { address: "Abu Dhabi,UAE", method: 8, tz: "Asia/Dubai" },
    Sharjah: { address: "Sharjah,UAE", method: 8, tz: "Asia/Dubai" },
  },
  Turkey: {
    Istanbul: { address: "Istanbul,Turkey", method: 13, tz: "Europe/Istanbul" },
    Ankara: { address: "Ankara,Turkey", method: 13, tz: "Europe/Istanbul" },
    Izmir: { address: "Izmir,Turkey", method: 13, tz: "Europe/Istanbul" },
  },
  Malaysia: {
    "Kuala Lumpur": {
      address: "Kuala Lumpur,Malaysia",
      method: 11,
      tz: "Asia/Kuala_Lumpur",
    },
    Penang: { address: "Penang,Malaysia", method: 11, tz: "Asia/Kuala_Lumpur" },
    "Johor Bahru": {
      address: "Johor Bahru,Malaysia",
      method: 11,
      tz: "Asia/Kuala_Lumpur",
    },
  },
  Indonesia: {
    Jakarta: { address: "Jakarta,Indonesia", method: 11, tz: "Asia/Jakarta" },
    Surabaya: { address: "Surabaya,Indonesia", method: 11, tz: "Asia/Jakarta" },
    Medan: { address: "Medan,Indonesia", method: 11, tz: "Asia/Jakarta" },
  },
  Egypt: {
    Cairo: { address: "Cairo,Egypt", method: 5, tz: "Africa/Cairo" },
    Alexandria: { address: "Alexandria,Egypt", method: 5, tz: "Africa/Alexandria" },
    Giza: { address: "Giza,Egypt", method: 5, tz: "Africa/Giza" },
  },
};

const PRAYER_CACHE_KEY = "zenith_prayer_settings";

export default function PrayerTimesWidget() {
  const [prayerTimes, setPrayerTimes] = useState({});
  const [prayerEndTimes, setPrayerEndTimes] = useState({});
  const [nextPrayer, setNextPrayer] = useState(null);
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [timeToNext, setTimeToNext] = useState("");
  const [currentPrayerProgress, setCurrentPrayerProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("Bangladesh");
  const [selectedCity, setSelectedCity] = useState("Dhaka");
  const [madhab, setMadhab] = useState("Standard");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  useEffect(() => {
    loadCachedSettings();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      Object.keys(prayerTimes).length > 0 &&
      Object.keys(prayerEndTimes).length > 0
    ) {
      updateNextPrayer();
    }
  }, [prayerTimes, prayerEndTimes, currentTime]);

  useEffect(() => {
    const cities = Object.keys(LOCATIONS[selectedCountry] || {});
    if (cities.length && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [selectedCountry, selectedCity]);

  const loadCachedSettings = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCountry = params.get("country");
      const urlCity = params.get("city");
      const urlMadhab = params.get("madhab");

      if (urlCountry && urlCity) {
        const country = LOCATIONS[urlCountry] ? urlCountry : "Bangladesh";
        const city = LOCATIONS[country]?.[urlCity] ? urlCity : Object.keys(LOCATIONS[country])[0];
        const localMadhab = urlMadhab === "Hanafi" ? "Hanafi" : "Standard";
        setSelectedCountry(country);
        setSelectedCity(city);
        setMadhab(localMadhab);
        const location = LOCATIONS[country][city];
        fetchPrayerTimes(location.address, location.method, localMadhab);
        return;
      }

      const raw = localStorage.getItem(PRAYER_CACHE_KEY);
      if (!raw) {
        fetchPrayerTimes("Dhaka,Bangladesh", 1, "Standard");
        return;
      }
      const parsed = JSON.parse(raw);
      const country = parsed.country || "Bangladesh";
      const city = parsed.city || "Dhaka";
      const localMadhab = parsed.madhab || "Standard";
      setSelectedCountry(country);
      setSelectedCity(city);
      setMadhab(localMadhab);
      const location = LOCATIONS[country]?.[city];
      fetchPrayerTimes(location?.address || "Dhaka,Bangladesh", location?.method || 1, localMadhab);
    } catch (_e) {
      fetchPrayerTimes("Dhaka,Bangladesh", 1, "Standard");
    }
  };

  const buildEmbedUrl = (country, city, selectedMadhab) => {
    const u = new URL(window.location.href.split("?")[0], window.location.href);
    u.searchParams.set("country", country);
    u.searchParams.set("city", city);
    u.searchParams.set("madhab", selectedMadhab);
    return u.toString();
  };

  const copyEmbedUrl = async () => {
    const url = buildEmbedUrl(selectedCountry, selectedCity, madhab);
    try {
      await navigator.clipboard.writeText(url);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2500);
    } catch (_e) {
      window.prompt("Copy this embed URL:", url);
    }
  };

  const saveCachedSettings = (country, city, selectedMadhab) => {
    localStorage.setItem(
      PRAYER_CACHE_KEY,
      JSON.stringify({
        country,
        city,
        madhab: selectedMadhab,
        timestamp: new Date().toISOString(),
      }),
    );
  };

  const fetchPrayerTimes = async (address, method, currentMadhab = "Standard") => {
    const school = currentMadhab === "Hanafi" ? 1 : 0;
    const cacheKey = `prayer_times_${address}_${method}_${school}`;
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(address)}&method=${method}&school=${school}`,
      );
      if (!response.ok) throw new Error("Prayer API request failed");

      const data = await response.json();
      if (data.code !== 200 || !data.data?.timings) throw new Error("Invalid prayer API response");

      const timings = data.data.timings;
      const formatted = {
        Fajr: formatTo12Hour(timings.Fajr),
        Sunrise: formatTo12Hour(timings.Sunrise),
        Dhuhr: formatTo12Hour(timings.Dhuhr),
        Asr: formatTo12Hour(timings.Asr),
        Maghrib: formatTo12Hour(timings.Maghrib),
        Isha: formatTo12Hour(timings.Isha),
      };

      setPrayerTimes(formatted);
      calculateEndTimes(formatted);
      localStorage.setItem(cacheKey, JSON.stringify(formatted));
    } catch (_e) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPrayerTimes(parsed);
        calculateEndTimes(parsed);
      } else {
        const fallback = {
          Fajr: "4:30 AM",
          Sunrise: "5:45 AM",
          Dhuhr: "12:05 PM",
          Asr: "4:30 PM",
          Maghrib: "6:15 PM",
          Isha: "7:45 PM",
        };
        setPrayerTimes(fallback);
        calculateEndTimes(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTo12Hour = (time24) => {
    const [h, m] = time24.split(" ")[0].split(":");
    let hour = Number(h);
    let period = "AM";
    if (hour === 0) hour = 12;
    else if (hour === 12) period = "PM";
    else if (hour > 12) {
      hour -= 12;
      period = "PM";
    }
    return `${hour}:${m} ${period}`;
  };

  const parseTime = (timeStr) => {
    const [time, period] = String(timeStr).split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let adjusted = hours;
    if (period === "PM" && hours !== 12) adjusted += 12;
    if (period === "AM" && hours === 12) adjusted = 0;
    return { hours: adjusted, minutes };
  };

  const addMinutes = (timeStr, minutes) => {
    const p = parseTime(timeStr);
    const date = new Date();
    date.setHours(p.hours, p.minutes, 0);
    date.setMinutes(date.getMinutes() + minutes);
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    let period = "AM";
    if (h >= 12) {
      period = "PM";
      if (h > 12) h -= 12;
    }
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  };

  const calculateEndTimes = (times) => {
    setPrayerEndTimes({
      Fajr: times.Sunrise,
      Dhuhr: times.Asr,
      Asr: times.Maghrib,
      Maghrib: times.Isha,
      Isha: "Next Fajr",
    });
  };

  const updateNextPrayer = () => {
    if (!Object.keys(prayerTimes).length) return;
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    const prayers = [
      { name: "Fajr", time: prayerTimes.Fajr },
      { name: "Dhuhr", time: prayerTimes.Dhuhr },
      { name: "Asr", time: prayerTimes.Asr },
      { name: "Maghrib", time: prayerTimes.Maghrib },
      { name: "Isha", time: prayerTimes.Isha },
    ];

    let next = null;
    let current = null;
    let progress = 0;

    for (let i = 0; i < prayers.length; i++) {
      const prayer = prayers[i];
      const parsed = parseTime(prayer.time);
      const mins = parsed.hours * 60 + parsed.minutes;
      if (mins > currentMinutes) {
        next = prayer;
        current = i === 0 ? prayers[prayers.length - 1] : prayers[i - 1];
        break;
      }
    }

    if (current && prayerEndTimes[current.name] && prayerEndTimes[current.name] !== "Next Fajr") {
      const e = parseTime(prayerEndTimes[current.name]);
      const endMins = e.hours * 60 + e.minutes;
      if (currentMinutes >= endMins) current = null;
    }

    if (!next) {
      next = prayers[0];
      current = prayers[prayers.length - 1];
      const fajr = parseTime(prayers[0].time);
      const fajrSeconds = fajr.hours * 3600 + fajr.minutes * 60;
      const nowSeconds = currentMinutes * 60 + currentSeconds;
      const toMidnight = 24 * 3600 - nowSeconds;
      const total = toMidnight + fajrSeconds;
      setTimeToNext(toHms(total));
      const isha = parseTime(prayerTimes.Isha);
      const ishaMins = isha.hours * 60 + isha.minutes;
      const totalDuration = 24 * 60 - ishaMins + (fajr.hours * 60 + fajr.minutes);
      const elapsed = currentMinutes - ishaMins;
      progress = (elapsed / totalDuration) * 100;
    } else {
      const n = parseTime(next.time);
      const nextSeconds = n.hours * 3600 + n.minutes * 60;
      const nowSeconds = currentMinutes * 60 + currentSeconds;
      setTimeToNext(toHms(Math.max(0, nextSeconds - nowSeconds)));
      if (current) {
        const c = parseTime(current.time);
        const cStart = c.hours * 60 + c.minutes;
        let nStart = n.hours * 60 + n.minutes;
        if (current.name === "Isha" && next.name === "Fajr") nStart += 24 * 60;
        const totalDuration = nStart - cStart;
        const elapsed = currentMinutes - cStart;
        progress = (elapsed / totalDuration) * 100;
      }
    }

    setNextPrayer(next);
    setCurrentPrayer(current);
    setCurrentPrayerProgress(Math.max(0, Math.min(100, progress)));
  };

  const toHms = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const saveSettings = async () => {
    if (!selectedCountry || !selectedCity) return;
    const location = LOCATIONS[selectedCountry]?.[selectedCity];
    if (!location) return;
    saveCachedSettings(selectedCountry, selectedCity, madhab);
    setShowLoginPrompt(true);
    setTimeout(() => setShowLoginPrompt(false), 2200);
    await fetchPrayerTimes(location.address, location.method, madhab);
    setShowSettings(false);
  };

  const getPrayerIcon = (prayerName) => {
    switch (prayerName) {
      case "Fajr":
        return <Moon className="h-4 w-4 text-white" />;
      case "Sunrise":
        return <Sunrise className="h-4 w-4 text-white" />;
      case "Dhuhr":
        return <Sun className="h-4 w-4 text-white" />;
      case "Asr":
        return <Sun className="h-4 w-4 text-white/80" />;
      case "Maghrib":
        return <Sunrise className="h-4 w-4 rotate-180 text-white" />;
      case "Isha":
        return <Moon className="h-4 w-4 text-white/80" />;
      default:
        return <Sun className="h-4 w-4 text-white" />;
    }
  };

  const prayerList = useMemo(() => {
    if (!Object.keys(prayerTimes).length) return [];
    return ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((name) => ({
      name,
      time: prayerTimes[name],
      endTime: prayerEndTimes[name],
    }));
  }, [prayerTimes, prayerEndTimes]);

  const activeForbidden = useMemo(() => {
    if (!Object.keys(prayerTimes).length) return null;
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const checks = [
      {
        label: "Sunrise",
        start: addMinutes(prayerTimes.Sunrise, -10),
        end: addMinutes(prayerTimes.Sunrise, 10),
      },
      {
        label: "Zawal",
        start: addMinutes(prayerTimes.Dhuhr, -15),
        end: prayerTimes.Dhuhr,
      },
      {
        label: "Sunset",
        start: addMinutes(prayerTimes.Maghrib, -10),
        end: prayerTimes.Maghrib,
      },
    ];
    return (
      checks.find((c) => {
        const s = parseTime(c.start);
        const e = parseTime(c.end);
        const start = s.hours * 60 + s.minutes;
        const end = e.hours * 60 + e.minutes;
        return nowMins >= start && nowMins <= end;
      }) || null
    );
  }, [prayerTimes, currentTime]);

  const prayerItemVariants = {
    current: { opacity: 1, scale: 1 },
    next: { opacity: 1, scale: 1 },
    default: { opacity: 0.85, scale: 1 },
  };

  return (
    <>
      <motion.div
        className="w-full select-none"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="wide-widget overflow-hidden border-white/10 ">
          {/* Top bar: location + next prayer inline */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              <MosqueIcon className="h-4 w-4 shrink-0 text-white" />
              <div className="min-w-0">
                <h3 className="font-medium text-white text-sm">Prayer Times</h3>
                <h4 className="text-lg font-semibold text-white">{selectedCity}</h4>
                <p className="text-sm text-white/70">{selectedCountry}</p>
              </div>
              {isLoading && (
                <div className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white border-t-transparent" />
              )}
            </div>

            {!showSettings && nextPrayer && (
              <div className="flex flex-col min-w-0 flex-1 items-center justify-center gap-x-3 gap-y-1 flex-wrap px-2">
                <p className="whitespace-nowrap text-sm text-white/80">
                  Next prayer <span className="font-semibold text-emerald-300">{nextPrayer.name}</span> in
                </p>
                <p className="whitespace-nowrap font-mono text-5xl font-bold text-white">{timeToNext}</p>
                <div className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-white/10 sm:w-40 md:w-52">
                  <motion.div
                    className="h-2 rounded-full bg-emerald-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${currentPrayerProgress}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyEmbedUrl}
                className="h-12  gap-1.5 px-2 text-xs text-white/70 hover:bg-white/20 hover:text-white"
                title="Copy embed link for Notion"
              >
                <Copy className="h-6 w-6" />
                {embedCopied ? "Copied!" : ""}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings((v) => !v)}
                className="h-6 w-6 shrink-0 text-white/70 hover:bg-white/20 hover:text-white"
                aria-label="Settings"
              >
                <Settings className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Settings overlay */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-white/10"
              >
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-white/70" />
                      <span className="text-sm font-medium text-white">Location Settings</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(false)}
                      className="h-7 w-7 text-white/60 hover:bg-white/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {showLoginPrompt && (
                    <p className="rounded border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
                      Settings saved locally.
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs text-white/80">Country</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/80 border-white/20">
                          {Object.keys(LOCATIONS).map((country) => (
                            <SelectItem key={country} value={country} className="text-white hover:bg-white/20">
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-white/80">City</label>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/80 border-white/20">
                          {Object.keys(LOCATIONS[selectedCountry] || {}).map((city) => (
                            <SelectItem key={city} value={city} className="text-white hover:bg-white/20">
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-white/80">
                        Fiqh Madhab Calculation Method
                      </label>
                      <Select value={madhab} onValueChange={setMadhab}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/80 border-white/20">
                          <SelectItem value="Standard" className="text-white hover:bg-white/20">
                            Standard (Shafi&apos;i, Maliki, Hanbali)
                          </SelectItem>
                          <SelectItem value="Hanafi" className="text-white hover:bg-white/20">
                            Hanafi
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={saveSettings}
                      className="h-8 flex-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                    >
                      Save Locally
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEmbedUrl}
                      className="h-8 gap-1.5 border-white/20 bg-transparent text-xs text-white hover:bg-white/20"
                    >
                      <Copy className="h-3 w-3" />
                      {embedCopied ? "Copied!" : "Copy Embed URL"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(false)}
                      className="h-8 border-white/20 bg-transparent text-xs text-white hover:bg-white/20"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Horizontal prayer grid */}
          {!showSettings && (
            <CardContent className="p-4">
              {activeForbidden && (
                <p className="mb-3 rounded-md bg-orange-500/20 px-3 py-1.5 text-center text-xs text-orange-300">
                  Forbidden time: {activeForbidden.label}
                </p>
              )}

              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                <AnimatePresence>
                  {prayerList.map((item) => {
                    const isCurrent = currentPrayer?.name === item.name;
                    const isNext = nextPrayer?.name === item.name;
                    const variant = isCurrent ? "current" : isNext ? "next" : "default";

                    return (
                      <motion.div
                        key={item.name}
                        variants={prayerItemVariants}
                        animate={variant}
                        className={`flex flex-col items-center rounded-lg px-2 py-3 text-center transition-colors sm:px-3 sm:py-4 ${
                          isCurrent
                            ? "bg-emerald-600/25 ring-1 ring-emerald-500/40"
                            : isNext
                              ? "bg-white/8 ring-1 ring-white/15"
                              : "bg-white/[0.03]"
                        }`}
                      >
                        <span className="mb-1.5">{getPrayerIcon(item.name)}</span>
                        <span
                          className={`font-medium text-base ${
                            isCurrent ? "text-emerald-300" : "text-white"
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="mt-1 font-mono text-sm text-white/80">
                          {item.time} - {item.endTime}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </>
  );
}

