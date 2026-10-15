import {
  createDefaultBackDesign,
  createDefaultFrontDesign,
  type TemplateDesign,
  type TemplateElement,
} from "@/types/template";
import type { TemplateOrientation } from "@/lib/categories";

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  orientation: TemplateOrientation;
  usesAccent: boolean;
  front: (accent: string) => TemplateDesign;
  back: (accent: string) => TemplateDesign;
}

export const ACCENT_COLORS = [
  "#1e3a5f",
  "#1d4ed8",
  "#047857",
  "#b91c1c",
  "#7e22ce",
  "#c2410c",
];

let counter = 0;
function el(element: Omit<TemplateElement, "id" | "zIndex">): TemplateElement {
  counter += 1;
  return { ...element, id: `${element.type}-${Date.now()}-${counter}`, zIndex: counter };
}

function withZIndex(elements: TemplateElement[]): TemplateElement[] {
  return elements.map((element, index) => ({ ...element, zIndex: index + 1 }));
}

function recolorClassic(design: TemplateDesign, accent: string): TemplateDesign {
  return { ...design, backgroundColor: accent };
}

function emergencyBack(width: number, height: number, accent: string): TemplateDesign {
  const centered = width < height;
  const contentWidth = width - 60;
  return {
    backgroundColor: "#ffffff",
    elements: withZIndex([
      el({
        type: "shape",
        x: 0,
        y: 0,
        width,
        height: 70,
        style: { backgroundColor: accent },
      }),
      el({
        type: "text",
        content: "EMERGENCY CONTACT",
        x: 30,
        y: 18,
        width: contentWidth,
        height: 36,
        style: {
          fontSize: 20,
          fontWeight: "bold",
          color: "#ffffff",
          textAlign: centered ? "center" : "left",
        },
      }),
      el({
        type: "dynamic-field",
        fieldKey: "emergencyFullName",
        x: 30,
        y: 110,
        width: contentWidth,
        height: 34,
        style: { fontSize: 18, fontWeight: "bold", color: "#1e293b", textAlign: centered ? "center" : "left" },
      }),
      el({
        type: "dynamic-field",
        fieldKey: "emergencyAddress",
        x: 30,
        y: 160,
        width: contentWidth,
        height: 60,
        style: { fontSize: 14, color: "#475569", textAlign: centered ? "center" : "left" },
      }),
      el({
        type: "dynamic-field",
        fieldKey: "emergencyPhone",
        x: 30,
        y: 235,
        width: contentWidth,
        height: 30,
        style: { fontSize: 14, color: "#475569", textAlign: centered ? "center" : "left" },
      }),
      el({
        type: "barcode",
        x: Math.round((width - 420) / 2),
        y: height - 140,
        width: 420,
        height: 90,
        style: { backgroundColor: "#ffffff" },
      }),
    ]),
  };
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "classic-landscape",
    name: "Classic",
    description: "Landscape · colored background, photo on the left",
    orientation: "LANDSCAPE",
    usesAccent: true,
    front: (accent) => recolorClassic(createDefaultFrontDesign(), accent),
    back: () => createDefaultBackDesign(),
  },
  {
    id: "modern-portrait",
    name: "Modern Portrait",
    description: "Portrait · colored header, centered photo",
    orientation: "PORTRAIT",
    usesAccent: true,
    front: (accent) => ({
      backgroundColor: "#ffffff",
      elements: withZIndex([
        el({ type: "shape", x: 0, y: 0, width: 638, height: 270, style: { backgroundColor: accent } }),
        el({ type: "logo", x: 274, y: 28, width: 90, height: 90, style: { objectFit: "contain" } }),
        el({
          type: "dynamic-field",
          fieldKey: "schoolName",
          x: 30,
          y: 130,
          width: 578,
          height: 44,
          style: { fontSize: 24, fontWeight: "bold", color: "#ffffff", textAlign: "center", textTransform: "uppercase" },
        }),
        el({
          type: "photo",
          x: 209,
          y: 210,
          width: 220,
          height: 260,
          style: { borderWidth: 5, borderColor: "#ffffff", borderRadius: 12, objectFit: "cover" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "fullName",
          x: 30,
          y: 500,
          width: 578,
          height: 50,
          style: { fontSize: 30, fontWeight: "bold", color: "#0f172a", textAlign: "center", textTransform: "uppercase" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "grade",
          x: 30,
          y: 560,
          width: 578,
          height: 36,
          style: { fontSize: 20, color: accent, textAlign: "center", fontWeight: "bold" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "studentId",
          x: 30,
          y: 610,
          width: 578,
          height: 34,
          style: { fontSize: 20, color: "#475569", textAlign: "center" },
        }),
        el({ type: "qr-code", x: 249, y: 700, width: 140, height: 140, style: { backgroundColor: "#ffffff" } }),
        el({ type: "shape", x: 0, y: 961, width: 638, height: 50, style: { backgroundColor: accent } }),
      ]),
    }),
    back: (accent) => emergencyBack(638, 1011, accent),
  },
  {
    id: "minimal-landscape",
    name: "Minimal",
    description: "Landscape · white card with a color stripe",
    orientation: "LANDSCAPE",
    usesAccent: true,
    front: (accent) => ({
      backgroundColor: "#ffffff",
      elements: withZIndex([
        el({ type: "shape", x: 0, y: 0, width: 28, height: 638, style: { backgroundColor: accent } }),
        el({ type: "logo", x: 60, y: 36, width: 80, height: 80, style: { objectFit: "contain" } }),
        el({
          type: "dynamic-field",
          fieldKey: "schoolName",
          x: 160,
          y: 52,
          width: 780,
          height: 44,
          style: { fontSize: 24, fontWeight: "bold", color: accent },
        }),
        el({
          type: "photo",
          x: 60,
          y: 160,
          width: 190,
          height: 230,
          style: { borderWidth: 3, borderColor: accent, borderRadius: 8, objectFit: "cover" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "fullName",
          x: 290,
          y: 180,
          width: 650,
          height: 46,
          style: { fontSize: 30, fontWeight: "bold", color: "#0f172a", textTransform: "uppercase" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "studentId",
          x: 290,
          y: 240,
          width: 400,
          height: 34,
          style: { fontSize: 20, color: "#475569" },
        }),
        el({
          type: "dynamic-field",
          fieldKey: "grade",
          x: 290,
          y: 285,
          width: 400,
          height: 34,
          style: { fontSize: 20, color: "#475569" },
        }),
        el({ type: "qr-code", x: 820, y: 450, width: 140, height: 140, style: { backgroundColor: "#ffffff" } }),
      ]),
    }),
    back: (accent) => emergencyBack(1011, 638, accent),
  },
  {
    id: "blank-landscape",
    name: "Blank Landscape",
    description: "Start from an empty landscape card",
    orientation: "LANDSCAPE",
    usesAccent: false,
    front: () => ({ backgroundColor: "#ffffff", elements: [] }),
    back: () => ({ backgroundColor: "#ffffff", elements: [] }),
  },
  {
    id: "blank-portrait",
    name: "Blank Portrait",
    description: "Start from an empty portrait card",
    orientation: "PORTRAIT",
    usesAccent: false,
    front: () => ({ backgroundColor: "#ffffff", elements: [] }),
    back: () => ({ backgroundColor: "#ffffff", elements: [] }),
  },
];
