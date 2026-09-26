import React from "react";

const h = React.createElement;

export function ShieldIcon({ size = 22 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      style: { filter: "drop-shadow(0 0 6px currentColor)" }
    },
    h("path", {
      d: "M12 2.5L19.5 5.8V11.8C19.5 16.6 16.2 20.1 12 21.6C7.8 20.1 4.5 16.6 4.5 11.8V5.8L12 2.5Z",
      strokeLinejoin: "round"
    }),
    h("path", {
      d: "M8.8 12.2L11 14.4L15.4 9.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}

export function UploadIcon({ size = 28 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      style: { filter: "drop-shadow(0 0 6px currentColor)" }
    },
    h("path", {
      d: "M12 15.5V4M12 4L7.5 8.5M12 4L16.5 8.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }),
    h("path", {
      d: "M4 15.5V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V15.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}

export function AlertIcon({ size = 18 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      style: { filter: "drop-shadow(0 0 5px currentColor)" }
    },
    h("path", {
      d: "M12 9V13.5M12 16.8H12.01",
      strokeLinecap: "round"
    }),
    h("path", {
      d: "M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z",
      strokeLinejoin: "round"
    })
  );
}

export function CheckIcon({ size = 16 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.2",
      style: { filter: "drop-shadow(0 0 5px currentColor)" }
    },
    h("path", {
      d: "M4 12.5L9.2 17.5L20 6.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}

export function EmptyIcon({ size = 40 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      style: { filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.35))" }
    },
    h("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2.5" }),
    h("path", { d: "M3 9H21M8 4V9" }),
    h("circle", { cx: "12", cy: "14.5", r: "2" })
  );
}

export function DownloadIcon({ size = 16 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.9",
      style: { filter: "drop-shadow(0 0 5px currentColor)" }
    },
    h("path", {
      d: "M12 4V15M12 15L7.5 10.5M12 15L16.5 10.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }),
    h("path", {
      d: "M4 18V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V18",
      strokeLinecap: "round"
    })
  );
}