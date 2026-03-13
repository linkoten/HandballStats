const fs = require("fs");
const svg = fs.readFileSync("public/o1Vfa01.svg", "utf8");
const paths = svg.match(/<path[\s\S]*?\/>/g).join("\n          ");
const component = `import React from "react";

interface LogoProps {
  size?: number;
  mono?: boolean;
  className?: string;
}

export function Logo({ size = 120, mono = false, className = "" }: LogoProps) {
  const fillStyle = mono ? "white" : "url(#logo-colors)";

  return (
    <div className={\`flex items-center justify-center \${className}\`}>
      <svg 
        width={size} 
        height={size * (393/459)} 
        viewBox="0 0 459 393" 
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-colors duration-300"
      >
        <defs>
          <linearGradient id="logo-colors" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="45%" stopColor="#EA580C" />
            <stop offset="55%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <g transform="translate(0.000000,393.000000) scale(0.100000,-0.100000)"
           fill={fillStyle} stroke="none">
          ${paths}
        </g>
      </svg>
    </div>
  );
}
`;
fs.writeFileSync("components/logo.tsx", component);
console.log("Success!");

