"use client";

import { useEffect, useState, useCallback } from "react";
import { BrowserProvider, formatEther, parseEther } from "ethers";

const FEE_RECEIVER = "0x580Aab97021D7D379c8d26444eAae332C3014ba7";
const FEE_ETH = "0.00004";
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_HEX = "0x2105";
const TOKEN_NAME = "Base Terminal";
const TOKEN_TICKER = "TBASE";

type Tier = {
  key: string;
  label: string;
  min: number;
  max: number;
  allocation: number;
  color: string;
};

const TIERS: Tier[] = [
  { key: "signal", label: "Signal", min: 0, max: 0.4, allocation: 500, color: "#9C7A3F" },
  { key: "relay", label: "Relay", min: 0.4, max: 0.7, allocation: 1500, color: "#B8935A" },
  { key: "uplink", label: "Uplink", min: 0.7, max: 0.9, allocation: 3500, color: "#C9A227" },
  { key: "core", label: "Core Node", min: 0.9, max: 1.01, allocation: 7500, color: "#7A5C1E" },
];

function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min && score < t.max) ?? TIERS[0];
}

type FcUser = { fid: number; username?: string; pfpUrl?: string; displayName?: string };
type Step = "loading" | "ready" | "connecting" | "connected" | "registering" | "done" | "error";

export default function Page() {
  const [step, setStep] = useState<Step>("loading");
  const [fcUser, setFcUser] = useState<FcUser | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sdkRef, setSdkRef] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        setSdkRef(sdk);
        const context = await sdk.context;
        if (context?.user) {
          setFcUser({
            fid: context.user.fid,
            username: context.user.username,
            pfpUrl: context.user.pfpUrl,
            displayName: context.user.displayName,
          });
        }
        await sdk.actions.ready();
        setStep("ready");
      } catch (e) {
        console.error("SDK init failed", e);
        setStep("ready");
      }
    })();
  }, []);

  const fetchScore = useCallback(async (fid: number) => {
    setScoreLoading(true);
    try {
      const res = await fetch(`/api/neynar-score?fid=${fid}`);
      const data = await res.json();
      setScore(typeof data.score === "number" ? data.score : 0);
    } catch (e) {
      console.error(e);
      setScore(0);
    } finally {
      setScoreLoading(false);
    }
  }, []);

  const checkRegistered = useCallback(async (fid: number) => {
    try {
      const res = await fetch(`/api/register?fid=${fid}`);
      const data = await res.json();
      setAlreadyRegistered(!!data.registered);
      if (data.registered && data.entry?.txHash) setTxHash(data.entry.txHash);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const connectWallet = async () => {
    setStep("connecting");
    setErrorMsg(null);
    try {
      let provider: any;
      if (sdkRef?.wallet?.getEthereumProvider) {
        provider = await sdkRef.wallet.getEthereumProvider();
      } else if (typeof window !== "undefined" && (window as any).ethereum) {
        provider = (window as any).ethereum;
      } else {
        throw new Error("No wallet provider available. Open this inside Farcaster.");
      }

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts?.[0]) throw new Error("No account returned");

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_HEX }],
        });
      } catch {
        // ignore if switch not supported
      }

      setAddress(accounts[0]);
      (window as any).__ethProvider = provider;
      setStep("connected");

      if (fcUser?.fid) {
        fetchScore(fcUser.fid);
        checkRegistered(fcUser.fid);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Wallet connection failed");
      setStep("ready");
    }
  };

  const register = async () => {
    if (!address || score === null || !fcUser?.fid) return;
    setStep("registering");
    setErrorMsg(null);
    try {
      const provider = (window as any).__ethProvider;
      const browserProvider = new BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      const message = `Register for ${TOKEN_NAME} ($${TOKEN_TICKER}) Airdrop\nFID: ${fcUser.fid}\nWallet: ${address}\nNeynar Score: ${score.toFixed(2)}`;
      const signature = await signer.signMessage(message);

      const tx = await signer.sendTransaction({
        to: FEE_RECEIVER,
        value: parseEther(FEE_ETH),
      });
      setTxHash(tx.hash);
      await tx.wait?.(1).catch(() => {});

      const tier = tierFor(score);

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: fcUser.fid,
          username: fcUser.username,
          address,
          score,
          tier: tier.key,
          allocation: tier.allocation,
          signature,
          message,
          txHash: tx.hash,
        }),
      });
      if (!res.ok) throw new Error("Failed to save registration");

      setAlreadyRegistered(true);
      setStep("done");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Registration failed");
      setStep("connected");
    }
  };

  const tier = score !== null ? tierFor(score) : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-md flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center mb-4 shadow-lg">
          <span className="font-display text-cream-50 text-2xl italic">B</span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Base Terminal
        </h1>
        <p className="font-mono text-xs tracking-[0.2em] text-gold-600 mt-1 uppercase">
          ${TOKEN_TICKER} · Airdrop Registration
        </p>
        <p className="font-body text-sm text-ink/60 mt-3 leading-relaxed">
          Allocation is scored by your on-chain reputation —{" "}
          <span className="italic font-display text-ink/80">Neynar Score</span>. Connect,
          verify, and lock in your tier.
        </p>
      </div>

      {fcUser && (
        <div className="w-full max-w-md flex items-center gap-3 bg-white/60 border border-ink/10 rounded-xl px-4 py-3 mb-4">
          {fcUser.pfpUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fcUser.pfpUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          )}
          <div className="flex flex-col">
            <span className="font-body text-sm font-semibold text-ink">
              {fcUser.displayName || fcUser.username || `FID ${fcUser.fid}`}
            </span>
            <span className="font-mono text-[11px] text-ink/50">FID {fcUser.fid}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-cream-50 border border-ink/10 rounded-2xl shadow-sm p-6">
        {step === "loading" && (
          <p className="text-center font-body text-sm text-ink/50 py-6">Loading Base Terminal…</p>
        )}

        {(step === "ready" || step === "connecting") && !address && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="font-body text-sm text-ink/70 text-center">
              Connect your Farcaster wallet to check your Neynar Score and reveal your $TBASE tier.
            </p>
            <button
              onClick={connectWallet}
              disabled={step === "connecting"}
              className="w-full py-3.5 rounded-xl bg-ink text-cream-50 font-body font-semibold text-sm tracking-wide hover:bg-ink/90 transition disabled:opacity-60"
            >
              {step === "connecting" ? "Connecting…" : "Connect Wallet"}
            </button>
            {errorMsg && <p className="text-xs text-red-700 text-center">{errorMsg}</p>}
          </div>
        )}

        {address && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-ink/10 pb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">
                Wallet
              </span>
              <span className="font-mono text-xs text-ink">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-ink/10 pb-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">
                Neynar Score
              </span>
              <span className="font-display text-lg font-semibold text-ink">
                {scoreLoading ? "…" : score !== null ? score.toFixed(2) : "—"}
              </span>
            </div>

            {tier && !scoreLoading && (
              <div
                className="tier-card rounded-xl p-4 border"
                style={{ borderColor: tier.color, backgroundColor: `${tier.color}12` }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-display italic text-lg" style={{ color: tier.color }}>
                    {tier.label}
                  </span>
                  <span className="font-mono text-xs text-ink/50 uppercase tracking-widest">
                    Tier
                  </span>
                </div>
                <div className="mt-2 font-body text-2xl font-bold text-ink">
                  {tier.allocation.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-ink/50">${TOKEN_TICKER}</span>
                </div>
                <p className="text-[11px] font-mono text-ink/40 mt-1">
                  Score range {tier.min.toFixed(1)}–{tier.max > 1 ? "1.0" : tier.max.toFixed(1)}
                </p>
              </div>
            )}

            {alreadyRegistered ? (
              <div className="text-center py-2">
                <p className="font-display italic text-lg text-gold-600">✓ Registered</p>
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-ink/50 underline break-all"
                  >
                    {txHash.slice(0, 10)}…{txHash.slice(-8)}
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={register}
                disabled={step === "registering" || scoreLoading}
                className="w-full py-3.5 rounded-xl bg-ink text-cream-50 font-body font-semibold text-sm tracking-wide hover:bg-ink/90 transition disabled:opacity-60"
              >
                {step === "registering" ? "Confirming in wallet…" : "Sign & Register"}
              </button>
            )}
            {errorMsg && <p className="text-xs text-red-700 text-center">{errorMsg}</p>}
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] text-ink/35 mt-8 tracking-widest uppercase">
        Base Mainnet
      </p>
    </main>
  );
}
