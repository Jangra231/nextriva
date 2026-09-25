export function WorldwideEventCardSkeleton() {
  return (
    <div className="worldwide-event-card-skeleton" aria-hidden="true" style={{
      background: "#fff",
      borderRadius: "16px",
      border: "1px solid var(--line)",
      overflow: "hidden",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{
        width: "100%",
        aspectRatio: "16/9",
        background: "linear-gradient(90deg, #f0f3ee 25%, #e2e8dc 50%, #f0f3ee 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite"
      }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <div style={{ width: "40%", height: "12px", background: "#e2e8dc", borderRadius: "6px" }} />
        <div style={{ width: "90%", height: "18px", background: "#e2e8dc", borderRadius: "6px" }} />
        <div style={{ width: "60%", height: "14px", background: "#e2e8dc", borderRadius: "6px" }} />
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", paddingTop: "8px" }}>
          <div style={{ width: "30%", height: "14px", background: "#e2e8dc", borderRadius: "6px" }} />
          <div style={{ width: "25%", height: "14px", background: "#e2e8dc", borderRadius: "6px" }} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function WorldwideSlideshowSkeleton() {
  return (
    <div className="ww-slideshow-skeleton" aria-hidden="true" style={{
      width: "100%",
      height: "360px",
      borderRadius: "24px",
      background: "linear-gradient(90deg, #f0f3ee 25%, #e2e8dc 50%, #f0f3ee 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite"
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
