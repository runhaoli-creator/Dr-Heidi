/* Brief confetti shower when an idea is accepted. */

const COLORS = ["#f4cf6e", "#f9c8d2", "#cfdbff", "#cfeed9", "#e0cdf5"];

export function fireConfetti(originX = 0.5, originY = 0.4, count = 90) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.left = `calc(${originX * 100}vw + ${(Math.random() - 0.5) * 60}px)`;
    piece.style.top = `calc(${originY * 100}vh + ${(Math.random() - 0.5) * 30}px)`;
    piece.style.transform = `translate(${(Math.random() - 0.5) * 200}px, 0) rotate(${Math.random() * 360}deg)`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2400);
  }
}
