"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type PlayerTrack = {
  id: string;
  title: string;
  durationSec: number;
  artistName: string;
  artistSlug: string;
  releaseTitle: string;
  releaseSlug: string;
  coverUrl: string | null;
};

type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  playing: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  progressSec: number;
  playTracks: (tracks: PlayerTrack[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [progressSec, setProgressSec] = useState(0);
  const recordedRef = useRef<Set<string>>(new Set());
  const playingRef = useRef(false);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const audio = audioRef.current;

  const recordPlay = useCallback((trackId: string) => {
    if (recordedRef.current.has(trackId)) return;
    recordedRef.current.add(trackId);
    fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    }).catch(() => recordedRef.current.delete(trackId));
  }, []);

  const playTracks = useCallback((tracks: PlayerTrack[], startIndex = 0) => {
    setQueue(tracks);
    setIndex(startIndex);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current || !current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  }, [playing, current]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle) {
      const candidates = queue.map((_, i) => i).filter((i) => i !== index);
      setIndex(candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : index);
    } else if (index + 1 < queue.length) {
      setIndex(index + 1);
    } else if (repeat === "all") {
      setIndex(0);
    } else {
      setPlaying(false);
      return;
    }
    setPlaying(true);
  }, [queue, index, shuffle, repeat]);

  const prev = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (index > 0) {
      setIndex(index - 1);
      setPlaying(true);
    } else if (repeat === "all" && queue.length > 0) {
      setIndex(queue.length - 1);
      setPlaying(true);
    }
  }, [index, queue.length, repeat]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    []
  );

  // Load + play whenever the current track changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    el.src = `/api/stream/${current.id}`;
    el.load();
    if (playingRef.current) {
      el.play().catch(() => setPlaying(false));
      recordPlay(current.id);
    }
    setProgressSec(0);
  }, [current?.id, recordPlay]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume, current?.id]);

  const value = useMemo<PlayerState>(
    () => ({
      current,
      queue,
      playing,
      volume,
      shuffle,
      repeat,
      progressSec,
      playTracks,
      toggle,
      next,
      prev,
      setVolume,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      current,
      queue,
      playing,
      volume,
      shuffle,
      repeat,
      progressSec,
      playTracks,
      toggle,
      next,
      prev,
      setVolume,
      toggleShuffle,
      cycleRepeat,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgressSec(e.currentTarget.currentTime)}
        onEnded={() => {
          const el = audioRef.current;
          if (repeat === "one" && el) {
            el.currentTime = 0;
            el.play().catch(() => setPlaying(false));
          } else {
            next();
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        preload="none"
      />
      {/* Screen-reader live region for now-playing changes */}
      <p aria-live="polite" className="sr-only">
        {current ? `Now playing ${current.title} by ${current.artistName}` : "Player idle"}
      </p>
    </PlayerContext.Provider>
  );
}
