/**
 * Generate placeholder images as data URIs
 */

export const generatePlaceholderImage = (text = "Image") => {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= canvas.width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= canvas.height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Simple face
  ctx.fillStyle = "#d1d5db";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 100, 40, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 15, 90, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(canvas.width / 2 + 15, 90, 5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 110, 10, 0, Math.PI);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#6b7280";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, 250);

  return canvas.toDataURL("image/png");
};
