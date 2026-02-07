import { ISO_MAP, RC } from "../data/index.js";

export default function Tooltip(props) {
  var hov = props.hov;
  if (!hov) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(6,12,24,0.92)",
        border: "1px solid rgba(60,130,240,0.2)",
        borderRadius: 8,
        padding: "6px 14px",
        zIndex: 30,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#dce6f2" }}>{hov.n}</span>
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 3,
            color:
              hov.t === "city"
                ? "#f2d59a"
                : hov.t === "county"
                  ? "#aaddff"
                  : hov.t === "s"
                    ? "#5ea8f0"
                    : "#7ec87e",
            background:
              hov.t === "city"
                ? "rgba(242,213,154,0.12)"
                : hov.t === "county"
                  ? "rgba(170,221,255,0.12)"
                  : hov.t === "s"
                    ? "rgba(94,168,240,0.12)"
                    : "rgba(126,200,126,0.12)",
          }}
        >
          {hov.t === "city"
            ? "CITY"
            : hov.t === "county"
              ? "COUNTY"
              : hov.t === "s"
                ? hov.parentIso && ISO_MAP[hov.parentIso]
                  ? ISO_MAP[hov.parentIso].subdivisionLabel.toUpperCase()
                  : "STATE"
                : "COUNTRY"}
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 300, color: "#4d9ae8" }}>{(hov.p || 0).toLocaleString()}</div>
      {hov.rg && <div style={{ fontSize: 10, color: RC[hov.rg] || "#7b8fa8" }}>{hov.rg}{hov.cp ? " · " + hov.cp : ""}</div>}
    </div>
  );
}
