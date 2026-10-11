
import { useEffect } from "react";
import "./CursorWaves.css";

export default function CursorWaves() {
  useEffect(() => {
    let lastWave = 0;

    const handleMouseMove = (event) => {
      const now = performance.now();

      if (now - lastWave < 75) return;
      lastWave = now;

      const wave = document.createElement("span");
      wave.className = "cursor-water-wave";
      wave.style.left = `${event.clientX}px`;
      wave.style.top = `${event.clientY}px`;

      document.body.appendChild(wave);

      wave.addEventListener("animationend", () => {
        wave.remove();
      }, { once: true });
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.querySelectorAll(".cursor-water-wave").forEach((wave) => {
        wave.remove();
      });
    };
  }, []);

  return null;
}
