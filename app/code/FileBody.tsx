"use client";

import { useState } from "react";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function FileBody({
  html,
  raw,
  lines,
  bytes,
}: {
  html: string;
  raw: string;
  lines: number;
  bytes: number;
}) {
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#30363d]">
      {/* toolbar */}
      <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs text-[#7d8590]">
        <span>
          {lines} {lines === 1 ? "line" : "lines"} · {fmtBytes(bytes)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWrap((w) => !w)}
            className={`rounded px-2 py-1 hover:bg-[#30363d] hover:text-[#e6edf3] ${
              wrap ? "text-[#2f81f7]" : ""
            }`}
          >
            Wrap
          </button>
          <button
            onClick={copy}
            className="rounded px-2 py-1 hover:bg-[#30363d] hover:text-[#e6edf3]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {/* code */}
      <div
        className={`code-block overflow-x-auto bg-[#0d1117] py-2 text-[13px] leading-[1.5] [&_pre]:!bg-transparent ${
          wrap ? "wrap" : ""
        }`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
