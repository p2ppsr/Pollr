// src/context/userContext.tsx
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, PropsWithChildren,
} from "react";
import {
  WalletClient, PushDrop, LookupResolver, TopicBroadcaster, IdentityClient,
  Transaction, Utils
} from "@bsv/sdk";
import type { LookupQuestion } from "@bsv/overlay";

type NetworkPreset = "local" | "mainnet" | "testnet" | (string & {});
type PublicKeyString = string;

type Clients = {
  wallet: WalletClient;
  resolver: LookupResolver;
  broadcaster: TopicBroadcaster;
  pushdrop: PushDrop;
  identity: IdentityClient;
  networkPreset: NetworkPreset;
};

type UserContextValue = {
  ready: boolean;
  userId: PublicKeyString | null;
  clients: Clients | null;

  /** Ensure singletons exist and return them */
  getClients: () => Promise<Clients>;
  /** Refresh identity public key (walID) */
  refreshUserId: () => Promise<PublicKeyString | null>;
  /** Run fn with an AbortSignal bound to provider lifecycle */
  withSignal: <T>(fn: (signal: AbortSignal, c: Clients) => Promise<T>) => Promise<T>;
  /** Clear caches and re-init (on logout / net switch) */
  reset: () => void;

  /** Helpful, cached utilities */
  getAvatarCached: (identityKey: string, ttlMs?: number) => Promise<string>;
  decodeFieldsCached: (lockingScriptHex: string, ttlMs?: number) => Promise<string[]>;
  queryLS: (q: LookupQuestion, ttlMs?: number) => Promise<any>;
};

const Ctx = createContext<UserContextValue | null>(null);

function resolvePreset(hostname: string, walletNet: string): NetworkPreset {
  return hostname === "localhost" ? "local" : (walletNet as NetworkPreset);
}

export function UserProvider({ children }: PropsWithChildren<{}>) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<PublicKeyString | null>(null);

  const clientsRef = useRef<Clients | null>(null);
  const initRef = useRef<Promise<void> | null>(null);
  const providerAbortRef = useRef<AbortController | null>(null);

  // Tiny TTL caches + inflight de-dupe
  const inflight = useRef(new Map<string, Promise<any>>()).current;
  const avatarCache = useRef(new Map<string, { v: string; exp: number }>()).current;
  const decodeCache = useRef(new Map<string, { v: string[]; exp: number }>()).current;
  const lsCache = useRef(new Map<string, { v: any; exp: number }>()).current;

  const init = useCallback(async () => {
    if (clientsRef.current) return;
    if (initRef.current) return initRef.current;

    initRef.current = (async () => {
      const wallet = new WalletClient();
      const { network } = await wallet.getNetwork();
      const preset: NetworkPreset = resolvePreset(window.location.hostname, network);
      const allowedPresets = ["local", "mainnet", "testnet"] as const;
      const safePreset = allowedPresets.includes(preset as any) ? preset as "local" | "mainnet" | "testnet" : undefined;
      const resolver = new LookupResolver({ networkPreset: safePreset });
      const broadcaster = new TopicBroadcaster(["tm_pollr"], { networkPreset: safePreset });
      const pushdrop = new PushDrop(wallet);
      const identity = new IdentityClient(wallet);

      clientsRef.current = { wallet, resolver, broadcaster, pushdrop, identity, networkPreset: preset };

      try {
        const { publicKey } = await wallet.getPublicKey({ identityKey: true });
        setUserId(String(publicKey));
      } catch {
        setUserId(null);
      }
      setReady(true);
    })();
    return initRef.current;
  }, []);

  useEffect(() => {
    providerAbortRef.current = new AbortController();
    void init();
    return () => {
      providerAbortRef.current?.abort();
      providerAbortRef.current = null;
    };
  }, [init]);

  const getClients = useCallback(async () => {
    if (!clientsRef.current) await init();
    return clientsRef.current!;
  }, [init]);

  const refreshUserId = useCallback(async () => {
    const { wallet } = await getClients();
    try {
      const { publicKey } = await wallet.getPublicKey({ identityKey: true });
      const id = String(publicKey);
      setUserId(id);
      return id;
    } catch {
      setUserId(null);
      return null;
    }
  }, [getClients]);

  const withSignal = useCallback<UserContextValue["withSignal"]>(async (fn) => {
    const c = await getClients();
    const ac = new AbortController();
    const ps = providerAbortRef.current?.signal;
    const onAbort = () => ac.abort();
    ps?.addEventListener("abort", onAbort, { once: true });
    try {
      return await fn(ac.signal, c);
    } finally {
      ps?.removeEventListener?.("abort", onAbort);
    }
  }, [getClients]);

  // ---- cached helpers ------------------------------------------------------

  const once = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    const i = inflight.get(key);
    if (i) return i as Promise<T>;
    const p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }, [inflight]);

  const getAvatarCached = useCallback<UserContextValue["getAvatarCached"]>(
    async (identityKey, ttlMs = 10 * 60_000) => {
      const now = Date.now();
      const hit = avatarCache.get(identityKey);
      if (hit && hit.exp > now) return hit.v;
      const { identity } = await getClients();
      const result = await once(`avatar:${identityKey}`, async () => {
        try {
          const identities = await identity.resolveByIdentityKey({ identityKey });
          return identities[0]?.avatarURL ?? "";
        } catch {
          return "";
        }
      });
      avatarCache.set(identityKey, { v: result, exp: now + ttlMs });
      return result;
    },
    [avatarCache, getClients, once]
  );

  const decodeFieldsCached = useCallback<UserContextValue["decodeFieldsCached"]>(
    async (lockingScriptHex, ttlMs = 5 * 60_000) => {
      const now = Date.now();
      const hit = decodeCache.get(lockingScriptHex);
      if (hit && hit.exp > now) return hit.v;
      const v = await once(`decode:${lockingScriptHex}`, async () => {
        const decoded = await PushDrop.decode({ toHex: () => lockingScriptHex } as any);
        const r = new Utils.Reader(decoded.fields[0]);
        const out: string[] = [];
        while (!r.eof()) {
          const n = r.readVarIntNum();
          const bytes = r.read(n);
          out.push(Utils.toUTF8(bytes));
        }
        return out;
      });
      decodeCache.set(lockingScriptHex, { v, exp: now + ttlMs });
      return v;
    },
    [decodeCache, once]
  );

  const queryLS = useCallback<UserContextValue["queryLS"]>(
    async (q, ttlMs = 2 * 60_000) => {
      const key = `ls:${JSON.stringify(q)}`;
      const now = Date.now();
      const hit = lsCache.get(key);
      if (hit && hit.exp > now) return hit.v;
      const { resolver } = await getClients();
      const v = await once(key, async () => resolver.query(q));
      lsCache.set(key, { v, exp: now + ttlMs });
      return v;
    },
    [getClients, lsCache, once]
  );

  const reset = useCallback(() => {
    providerAbortRef.current?.abort();
    providerAbortRef.current = new AbortController();
    clientsRef.current = null;
    initRef.current = null;
    setUserId(null);
    setReady(false);
    avatarCache.clear();
    decodeCache.clear();
    lsCache.clear();
    inflight.clear();
    void init();
  }, [avatarCache, decodeCache, inflight, init, lsCache]);

  const value = useMemo<UserContextValue>(() => ({
    ready, userId, clients: clientsRef.current,
    getClients, refreshUserId, withSignal, reset,
    getAvatarCached, decodeFieldsCached, queryLS,
  }), [ready, userId, getClients, refreshUserId, withSignal, reset, getAvatarCached, decodeFieldsCached, queryLS]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUser = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser() must be used inside <UserProvider>");
  return ctx;
};
