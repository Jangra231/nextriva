"use client";

import { useMemo, useState } from "react";
import styles from "./AdminAnalytics.module.css";

type Activity = { label: string; date: string; registrations: number; revenue: number; platformFees: number };

export default function AdminAnalytics({ weeklyActivity, moderation }: { weeklyActivity: Activity[]; moderation: { awaitingApproval: number; changesRequested: number; liveEvents: number; events: number } }) {
  const [metric, setMetric] = useState<"registrations" | "revenue" | "platformFees">("registrations");
  const formatter = metric === "registrations" ? (value: number) => String(value) : (value: number) => `₹${(value / 100).toLocaleString("en-IN")}`;
  const maximum = useMemo(() => Math.max(1, ...weeklyActivity.map(row => row[metric])), [metric, weeklyActivity]);
  const total = weeklyActivity.reduce((sum, row) => sum + row[metric], 0);
  const moderationTotal = Math.max(1, moderation.events);
  const moderationBackground = moderation.events ? `conic-gradient(#ef654f 0 ${moderation.awaitingApproval / moderationTotal * 360}deg, #f4b544 ${moderation.awaitingApproval / moderationTotal * 360}deg ${(moderation.awaitingApproval + moderation.changesRequested) / moderationTotal * 360}deg, #1d7659 ${(moderation.awaitingApproval + moderation.changesRequested) / moderationTotal * 360}deg 360deg)` : "#edf0eb";
  return <div className={styles.layout}><section className={styles.activity}><div className={styles.controls}><div><b>{formatter(total)}</b><span>Last 7 days</span></div><div role="group" aria-label="Weekly chart measure">{(["registrations", "revenue", "platformFees"] as const).map(option => <button type="button" onClick={() => setMetric(option)} className={metric === option ? styles.active : ""} key={option}>{option === "platformFees" ? "Platform fees" : option === "revenue" ? "Gross value" : "Registrations"}</button>)}</div></div><div className={styles.bars} aria-label={`Weekly ${metric} chart`}>{weeklyActivity.map(row => <div className={styles.barItem} key={row.date}><span className={styles.value}>{formatter(row[metric])}</span><div className={styles.barTrack}><i style={{ height: `${Math.max(5, row[metric] / maximum * 100)}%` }} /></div><small>{row.label}</small></div>)}</div></section><aside className={styles.moderation}><h4>Moderation mix</h4><div className={styles.ring} style={{ background: moderationBackground }}><span>{moderation.events}</span></div><div className={styles.legend}><span><i className={styles.pending} /> {moderation.awaitingApproval} awaiting</span><span><i className={styles.changes} /> {moderation.changesRequested} changes</span><span><i className={styles.live} /> {moderation.liveEvents} live</span></div></aside></div>;
}
