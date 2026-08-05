"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "../../../components/ui/Button";

const BURGUNDY = "#7a1d34";
const BURGUNDY_DARK = "#571325";

/** Opens the composed PNG in a new window and prints it -- avoids print-CSS conflicts with the modal behind it. */
function printDataUrl(dataUrl: string) {
  const w = window.open("", "_blank", "width=460,height=680");
  if (!w) return;
  w.document.write(
    `<html><head><title>Needle Eye Login QR</title></head>` +
      `<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">` +
      `<img src="${dataUrl}" style="max-width:100%" onload="window.focus();window.print();" /></body></html>`,
  );
  w.document.close();
}

/**
 * An ID-card-style card carrying a Master Tailor's LOGIN QR (never a staff-id
 * or credential text) -- shown once, right after the QR is generated. The
 * card can be downloaded as a PNG or printed; both are composed from the same
 * offscreen canvas so they look identical. Regenerating the QR invalidates
 * whatever was printed/saved before.
 */
export function LoginQrCard({ fullName, roleLabel, loginUrl }: { fullName: string; roleLabel: string; loginUrl: string }) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  function compose(): string | null {
    const qrCanvas = qrRef.current;
    if (!qrCanvas) return null;

    const scale = 2;
    const width = 320;
    const height = 400;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Header band
    ctx.fillStyle = BURGUNDY;
    ctx.fillRect(0, 0, width, 56);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = "700 20px Georgia, serif";
    ctx.fillText("Needleye", 20, 24);
    ctx.font = "600 11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("STAFF LOGIN", 20, 42);

    // Name + role
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText(fullName, 20, 82);
    ctx.fillStyle = BURGUNDY_DARK;
    ctx.font = "600 13px Arial, sans-serif";
    ctx.fillText(roleLabel, 20, 104);

    // QR (centered)
    const qrSize = 200;
    ctx.drawImage(qrCanvas, (width - qrSize) / 2, 124, qrSize, qrSize);

    // Caption + footer
    ctx.fillStyle = "#555555";
    ctx.font = "12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scan to log in to Needleye", width / 2, 344);
    ctx.fillStyle = "#999999";
    ctx.font = "10px Arial, sans-serif";
    ctx.fillText("Keep private · regenerating replaces this code", width / 2, 366);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png");
  }

  function handleDownload() {
    const dataUrl = compose();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `needleye-login-${fullName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  }

  function handlePrint() {
    const dataUrl = compose();
    if (dataUrl) printDataUrl(dataUrl);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[240px] overflow-hidden rounded-app-lg border border-border bg-white text-black shadow-app">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: BURGUNDY }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-app bg-white/15 text-sm">🪡</div>
          <div>
            <div className="font-serif text-sm leading-none font-bold text-white">Needleye</div>
            <div className="text-[9px] tracking-widest text-white/70 uppercase">Staff Login</div>
          </div>
        </div>
        <div className="px-4 pt-3 text-left">
          <div className="truncate text-sm font-bold text-neutral-900">{fullName}</div>
          <div className="text-xs font-semibold" style={{ color: BURGUNDY_DARK }}>
            {roleLabel}
          </div>
        </div>
        <div className="flex justify-center px-4 py-3">
          <QRCodeCanvas ref={qrRef} value={loginUrl} size={168} level="M" />
        </div>
        <div className="px-4 pb-3 text-center text-[10px] text-neutral-500">Scan to log in to Needleye</div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={handleDownload}>
          ⬇️ Save as image
        </Button>
        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={handlePrint}>
          🖨️ Print
        </Button>
      </div>
    </div>
  );
}
