import React from "react";

const dynamicPadding = "20px";

export function StyledBox() {
  return (
    <div
      style={{
        padding: "16px",
        margin: "8px",
        backgroundColor: "#7c3aed",
        color: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "24px" }}>
        Hello World
      </h2>
    </div>
  );
}

export function DynamicBox() {
  const isActive = true;
  return (
    <div
      style={{
        padding: dynamicPadding,
        backgroundColor: isActive ? "#7c3aed" : "#gray",
        margin: 16,
      }}
    >
      {/* slop-ignore: purple-plague */}
      <span style={{ color: "#9333ea" }}>Dynamic content</span>
    </div>
  );
}

export function EmptyStyle() {
  return <div style={{}}>No styles</div>;
}
