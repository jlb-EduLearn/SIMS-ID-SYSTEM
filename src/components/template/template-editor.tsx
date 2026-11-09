"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IdCardRenderer,
  TemplateElementView,
} from "@/components/id-card/id-card-renderer";
import {
  DYNAMIC_FIELD_LABELS,
  type DynamicFieldKey,
  type TemplateDesign,
  type TemplateElement,
  type TemplateElementStyle,
  type TemplateElementType,
} from "@/types/template";
import { getDimensionsForOrientation } from "@/lib/categories";
import {
  buildTemplateTextContent,
  parseTemplateTextContent,
} from "@/lib/template-text-content";
import { ACCENT_COLORS } from "@/lib/template-presets";
import { useSchoolSampleData } from "@/components/template/use-school-sample-data";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Barcode,
  Bold,
  CaseUpper,
  Copy,
  Eye,
  Hash,
  ImageIcon,
  Layers,
  MousePointerClick,
  Pencil,
  QrCode,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  School,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  User,
  UserSquare,
  GraduationCap,
  Users,
  type LucideIcon,
} from "lucide-react";

interface TemplateEditorProps {
  frontDesign: TemplateDesign;
  backDesign: TemplateDesign | null;
  width: number;
  height: number;
  orientation: "PORTRAIT" | "LANDSCAPE";
  onOrientationChange: (orientation: "PORTRAIT" | "LANDSCAPE") => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onFrontChange: (design: TemplateDesign) => void;
  onBackChange: (design: TemplateDesign) => void;
}

type Side = "front" | "back";
type Mode = "edit" | "preview";

interface AddItem {
  key: string;
  label: string;
  icon: LucideIcon;
  type: TemplateElementType;
  width: number;
  height: number;
  fieldKey?: DynamicFieldKey;
  content?: string;
  style?: TemplateElementStyle;
}

const ADD_GROUPS: { title: string; items: AddItem[] }[] = [
  {
    title: "Student details",
    items: [
      {
        key: "fullName",
        label: "Full Name",
        icon: User,
        type: "dynamic-field",
        fieldKey: "fullName",
        width: 420,
        height: 44,
        style: { fontSize: 24, fontWeight: "bold", textTransform: "uppercase" },
      },
      {
        key: "studentId",
        label: "ID Number",
        icon: Hash,
        type: "dynamic-field",
        fieldKey: "studentId",
        width: 280,
        height: 34,
        style: { fontSize: 18 },
      },
      {
        key: "grade",
        label: "Grade / Year",
        icon: GraduationCap,
        type: "dynamic-field",
        fieldKey: "grade",
        width: 280,
        height: 34,
        style: { fontSize: 18 },
      },
      {
        key: "section",
        label: "Section",
        icon: Users,
        type: "dynamic-field",
        fieldKey: "section",
        width: 280,
        height: 34,
        style: { fontSize: 18 },
      },
      {
        key: "schoolName",
        label: "School Name",
        icon: School,
        type: "dynamic-field",
        fieldKey: "schoolName",
        width: 460,
        height: 40,
        style: { fontSize: 20, fontWeight: "bold" },
      },
    ],
  },
  {
    title: "Pictures & codes",
    items: [
      { key: "photo", label: "Photo", icon: UserSquare, type: "photo", width: 150, height: 180, style: { objectFit: "cover" } },
      { key: "signature", label: "Signature", icon: Type, type: "signature", width: 160, height: 64, style: { objectFit: "contain" } },
      { key: "logo", label: "School Logo", icon: ImageIcon, type: "logo", width: 90, height: 90, style: { objectFit: "contain" } },
      { key: "qr", label: "QR Code", icon: QrCode, type: "qr-code", width: 120, height: 120, style: { backgroundColor: "#ffffff" } },
      { key: "barcode", label: "Barcode", icon: Barcode, type: "barcode", width: 320, height: 80, style: { backgroundColor: "#ffffff" } },
    ],
  },
  {
    title: "Other",
    items: [
      {
        key: "text",
        label: "Text",
        icon: Type,
        type: "text",
        width: 260,
        height: 34,
        content: "{fullName}",
        style: { fontSize: 16 },
      },
      { key: "shape", label: "Box / Shape", icon: Square, type: "shape", width: 200, height: 120, style: { backgroundColor: "#e2e8f0" } },
    ],
  },
];

const ELEMENT_ICONS: Record<TemplateElementType, LucideIcon> = {
  "dynamic-field": Type,
  text: Type,
  photo: UserSquare,
  signature: Type,
  logo: ImageIcon,
  "qr-code": QrCode,
  barcode: Barcode,
  shape: Square,
  image: ImageIcon,
};

function describeElement(element: TemplateElement): string {
  switch (element.type) {
    case "dynamic-field":
      return element.fieldKey ? DYNAMIC_FIELD_LABELS[element.fieldKey] : "Field";
    case "text":
      return `Text: ${element.content || ""}`;
    case "photo":
      return "Photo";
    case "signature":
      return "Signature";
    case "logo":
      return "School Logo";
    case "qr-code":
      return "QR Code";
    case "barcode":
      return "Barcode";
    case "shape":
      return "Box / Shape";
    default:
      return "Image";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: LucideIcon }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon && <option.icon className="h-3.5 w-3.5" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = parseInt(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className="mt-1 h-8"
      />
    </div>
  );
}

function ToggleButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer p-1"
        />
        <span className="flex-1 font-mono text-xs text-muted-foreground">
          {value || "None"}
        </span>
        {onClear && value && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
            None
          </Button>
        )}
      </div>
    </div>
  );
}

interface HistoryEntry {
  side: Side;
  design: TemplateDesign;
}

export function TemplateEditor({
  frontDesign,
  backDesign,
  width,
  height,
  orientation,
  onOrientationChange,
  onSizeChange,
  onFrontChange,
  onBackChange,
}: TemplateEditorProps) {
  const [side, setSide] = useState<Side>("front");
  const [mode, setMode] = useState<Mode>("edit");
  const [toolTab, setToolTab] = useState("add");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const [, setHistoryVersion] = useState(0);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef({
    past: [] as HistoryEntry[],
    future: [] as HistoryEntry[],
    lastKey: "",
    lastAt: 0,
  });

  const sampleData = useSchoolSampleData();
  const design = side === "front" ? frontDesign : backDesign || { elements: [] };
  const onChange = side === "front" ? onFrontChange : onBackChange;
  const selected = design.elements.find((el) => el.id === selectedId);
  const sortedElements = [...design.elements].sort((a, b) => a.zIndex - b.zIndex);
  const history = historyRef.current;

  useEffect(() => {
    function updateFitScale() {
      const viewportWidth = canvasViewportRef.current?.clientWidth ?? 600;
      const availableWidth = Math.max(240, viewportWidth - 32);
      const availableHeight = Math.max(320, Math.min(720, window.innerHeight * 0.68));
      const nextScale = Math.min(1, availableWidth / width, availableHeight / height);
      setScale(clamp(Number(nextScale.toFixed(3)), 0.2, 1));
    }

    updateFitScale();
    const resizeObserver = new ResizeObserver(updateFitScale);
    if (canvasViewportRef.current) resizeObserver.observe(canvasViewportRef.current);
    window.addEventListener("resize", updateFitScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFitScale);
    };
  }, [height, width]);

  const commit = useCallback(
    (next: TemplateDesign, mergeKey?: string) => {
      const h = historyRef.current;
      const now = Date.now();
      const merge = Boolean(mergeKey) && h.lastKey === mergeKey && now - h.lastAt < 1000;
      if (!merge) {
        h.past.push({ side, design });
        if (h.past.length > 100) h.past.shift();
      }
      h.future = [];
      h.lastKey = mergeKey || "";
      h.lastAt = now;
      onChange(next);
      setHistoryVersion((v) => v + 1);
    },
    [side, design, onChange]
  );

  const restore = useCallback(
    (from: "past" | "future") => {
      const h = historyRef.current;
      const entry = h[from].pop();
      if (!entry) return;
      const current =
        entry.side === "front" ? frontDesign : backDesign || { elements: [] };
      h[from === "past" ? "future" : "past"].push({ side: entry.side, design: current });
      h.lastKey = "";
      (entry.side === "front" ? onFrontChange : onBackChange)(entry.design);
      setSide(entry.side);
      setHistoryVersion((v) => v + 1);
    },
    [frontDesign, backDesign, onFrontChange, onBackChange]
  );

  const undo = useCallback(() => restore("past"), [restore]);
  const redo = useCallback(() => restore("future"), [restore]);

  const updateElement = useCallback(
    (id: string, updates: Partial<TemplateElement>, mergeKey?: string) => {
      commit(
        {
          ...design,
          elements: design.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
        },
        mergeKey
      );
    },
    [commit, design]
  );

  const updateStyle = useCallback(
    (element: TemplateElement, updates: TemplateElementStyle, mergeKey?: string) => {
      updateElement(element.id, { style: { ...element.style, ...updates } }, mergeKey);
    },
    [updateElement]
  );

  function placeNewElement(base: Omit<TemplateElement, "id" | "x" | "y" | "zIndex">) {
    const elementWidth = Math.min(base.width, width - 20);
    const elementHeight = Math.min(base.height, height - 20);
    const offset = (design.elements.length % 6) * 16;
    const maxZ = design.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const element: TemplateElement = {
      ...base,
      id: uuidv4(),
      width: elementWidth,
      height: elementHeight,
      x: clamp(Math.round((width - elementWidth) / 2) + offset, 0, width - elementWidth),
      y: clamp(Math.round((height - elementHeight) / 2) + offset, 0, height - elementHeight),
      zIndex: maxZ + 1,
    };
    commit({ ...design, elements: [...design.elements, element] });
    setSelectedId(element.id);
    setMode("edit");
  }

  function addItem(item: AddItem) {
    const isText = item.type === "text" || item.type === "dynamic-field";
    const defaultTextContent =
      item.type === "text" ? item.content || "{fullName}" : item.content;
    placeNewElement({
      type: item.type,
      width: item.width,
      height: item.height,
      fieldKey: item.fieldKey ?? (item.type === "dynamic-field" ? "fullName" : undefined),
      content: defaultTextContent,
      style: isText
        ? { fontSize: 14, ...item.style }
        : { ...item.style },
    });
  }

  function addField(fieldKey: DynamicFieldKey) {
    placeNewElement({
      type: "dynamic-field",
      fieldKey,
      width: 320,
      height: 34,
      style: { fontSize: 16 },
    });
  }

  const deleteElement = useCallback(
    (id: string) => {
      commit({ ...design, elements: design.elements.filter((el) => el.id !== id) });
      setSelectedId(null);
    },
    [commit, design]
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const original = design.elements.find((e) => e.id === id);
      if (!original) return;
      const maxZ = design.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const copy: TemplateElement = {
        ...original,
        id: uuidv4(),
        x: clamp(original.x + 20, 0, width - original.width),
        y: clamp(original.y + 20, 0, height - original.height),
        zIndex: maxZ + 1,
      };
      commit({ ...design, elements: [...design.elements, copy] });
      setSelectedId(copy.id);
    },
    [commit, design, width, height]
  );

  function moveLayer(id: string, direction: "up" | "down") {
    const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((e) => e.id === id);
    const swapIndex = direction === "up" ? index + 1 : index - 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    const temp = sorted[index].zIndex;
    sorted[index] = { ...sorted[index], zIndex: sorted[swapIndex].zIndex };
    sorted[swapIndex] = { ...sorted[swapIndex], zIndex: temp };
    commit({ ...design, elements: sorted });
  }

  function changeOrientation(next: "PORTRAIT" | "LANDSCAPE") {
    if (next === orientation) return;
    const dims = getDimensionsForOrientation(next);
    const remap = (source: TemplateDesign): TemplateDesign => ({
      ...source,
      elements: source.elements.map((el) => {
        const spansWidth = el.width >= width * 0.9;
        const spansHeight = el.height >= height * 0.9;
        const elementWidth = spansWidth
          ? Math.round((el.width * dims.width) / width)
          : Math.min(el.width, dims.width);
        const elementHeight = spansHeight
          ? Math.round((el.height * dims.height) / height)
          : Math.min(el.height, dims.height);
        const centerX = ((el.x + el.width / 2) * dims.width) / width;
        const centerY = ((el.y + el.height / 2) * dims.height) / height;
        return {
          ...el,
          width: elementWidth,
          height: elementHeight,
          x: clamp(Math.round(centerX - elementWidth / 2), 0, dims.width - elementWidth),
          y: clamp(Math.round(centerY - elementHeight / 2), 0, dims.height - elementHeight),
        };
      }),
    });

    onOrientationChange(next);
    onFrontChange(remap(frontDesign));
    if (backDesign) onBackChange(remap(backDesign));
    historyRef.current = { past: [], future: [], lastKey: "", lastAt: 0 };
    setHistoryVersion((v) => v + 1);
  }

  function updateTemplateSize(next: Partial<{ width: number; height: number }>) {
    onSizeChange({
      width: clamp(next.width ?? width, 100, 2000),
      height: clamp(next.height ?? height, 100, 2000),
    });
  }

  async function uploadBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "template-bg");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";

    if (!res.ok) {
      toast({
        title: data?.error || "Failed to upload background image.",
        variant: "destructive",
      });
      return;
    }

    commit({ ...design, backgroundImage: data.url });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (mode !== "edit" || !selected) return;

      if (mod && key === "d") {
        e.preventDefault();
        duplicateElement(selected.id);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteElement(selected.id);
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        updateElement(
          selected.id,
          {
            x: clamp(selected.x + move[0], 0, width - selected.width),
            y: clamp(selected.y + move[1], 0, height - selected.height),
          },
          `nudge-${selected.id}`
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, selected, undo, redo, duplicateElement, deleteElement, updateElement, width, height]);

  const handleSize = 12 / scale;
  const handleStyle: React.CSSProperties = {
    width: handleSize,
    height: handleSize,
    background: "#ffffff",
    border: `${2 / scale}px solid hsl(var(--primary))`,
    borderRadius: 3 / scale,
  };
  const cornerHandles = {
    topLeft: { ...handleStyle, left: -handleSize / 2, top: -handleSize / 2 },
    topRight: { ...handleStyle, right: -handleSize / 2, top: -handleSize / 2 },
    bottomLeft: { ...handleStyle, left: -handleSize / 2, bottom: -handleSize / 2 },
    bottomRight: { ...handleStyle, right: -handleSize / 2, bottom: -handleSize / 2 },
  };

  const isTextual = selected?.type === "text" || selected?.type === "dynamic-field";
  const SelectedIcon = selected ? ELEMENT_ICONS[selected.type] : null;
  const sideLabel = side === "front" ? "Front" : "Back";

  return (
    <div className="grid gap-4 md:grid-cols-[15.5rem_minmax(0,1fr)] 2xl:grid-cols-[15.5rem_minmax(0,1fr)_17rem]">
      {/* Tools */}
      <div className="order-2 min-w-0 rounded-xl border bg-white p-3 shadow-sm md:order-1 md:row-span-2 md:self-start 2xl:row-span-1">
        <Tabs value={toolTab} onValueChange={setToolTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Add</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="card">Card</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-3 space-y-4">
            <p className="text-xs text-muted-foreground">
              Click to add to the {sideLabel.toLowerCase()} of the card. Text is
              filled in from each student&apos;s record when printing.
            </p>
            {ADD_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                More fields
              </p>
              <Select value="" onValueChange={(v) => addField(v as DynamicFieldKey)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Add another field..." />
                </SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {Object.entries(DYNAMIC_FIELD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Everything on the {sideLabel.toLowerCase()}, top layer first. Click to select.
            </p>
            {design.elements.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nothing here yet. Use the Add tab.
              </p>
            ) : (
              <div className="max-h-[28rem] space-y-1 overflow-y-auto">
                {[...design.elements]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((el) => {
                    const Icon = ELEMENT_ICONS[el.type];
                    return (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(el.id);
                          setMode("edit");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          el.id === selectedId
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{describeElement(el)}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="card" className="mt-3 space-y-4">
            <PanelSection title="Orientation">
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { value: "LANDSCAPE", label: "Landscape", icon: RectangleHorizontal },
                    { value: "PORTRAIT", label: "Portrait", icon: RectangleVertical },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeOrientation(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors",
                      orientation === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary/50"
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Switching keeps your elements and moves them to fit.
              </p>
            </PanelSection>

            <PanelSection title="Card size (px)">
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Width"
                  value={width}
                  min={100}
                  max={2000}
                  onChange={(v) => updateTemplateSize({ width: v })}
                />
                <NumberField
                  label="Height"
                  value={height}
                  min={100}
                  max={2000}
                  onChange={(v) => updateTemplateSize({ height: v })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => onSizeChange(getDimensionsForOrientation(orientation))}
              >
                Reset to standard ID size
              </Button>
            </PanelSection>

            <PanelSection title={`Background (${sideLabel})`}>
              <ColorField
                label="Color"
                value={design.backgroundColor}
                onChange={(v) => commit({ ...design, backgroundColor: v }, "background-color")}
              />
              <div className="flex flex-wrap gap-1.5">
                {["#ffffff", ...ACCENT_COLORS].map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => commit({ ...design, backgroundColor: color })}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                      design.backgroundColor === color ? "border-primary" : "border-border"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                onChange={uploadBackground}
                className="hidden"
              />
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => backgroundInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {design.backgroundImage ? "Change image" : "Upload image"}
                </Button>
                {design.backgroundImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => commit({ ...design, backgroundImage: undefined })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </PanelSection>
          </TabsContent>
        </Tabs>
      </div>

      {/* Canvas */}
      <div className="order-1 min-w-0 rounded-xl border bg-card p-4 shadow-sm md:order-2 md:self-start">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<Side>
            value={side}
            onChange={(next) => {
              setSide(next);
              setSelectedId(null);
            }}
            options={[
              { value: "front", label: "Front" },
              { value: "back", label: "Back" },
            ]}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Undo (Ctrl+Z)"
              disabled={history.past.length === 0}
              onClick={undo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Redo (Ctrl+Shift+Z)"
              disabled={history.future.length === 0}
              onClick={redo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Segmented<Mode>
              value={mode}
              onChange={(next) => {
                setMode(next);
                if (next === "preview") setSelectedId(null);
              }}
              options={[
                { value: "edit", label: "Edit", icon: Pencil },
                { value: "preview", label: "Preview", icon: Eye },
              ]}
            />
          </div>
        </div>

        <div
          ref={canvasViewportRef}
          className="id-card-stage mt-4 flex min-h-[240px] justify-center overflow-auto rounded-lg border border-dashed border-border/70 p-6"
        >
          {mode === "preview" ? (
            <div className="inline-block overflow-hidden rounded-[2px] ring-1 ring-foreground/25 shadow-lg">
              <IdCardRenderer
                design={design}
                data={sampleData}
                width={width}
                height={height}
                scale={scale}
                sampleFallback
              />
            </div>
          ) : (
            <div
              className="relative shrink-0 overflow-hidden rounded-[2px] ring-1 ring-foreground/25 shadow-lg"
              style={{ width: width * scale, height: height * scale }}
              onMouseDown={() => setSelectedId(null)}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: design.backgroundColor || "#ffffff",
                  backgroundImage: design.backgroundImage
                    ? `url(${design.backgroundImage})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  width,
                  height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                {sortedElements.map((el) => {
                  const isSelected = el.id === selectedId;
                  return (
                    <Rnd
                      key={el.id}
                      size={{ width: el.width, height: el.height }}
                      position={{ x: el.x, y: el.y }}
                      bounds="parent"
                      scale={scale}
                      enableResizing={isSelected}
                      resizeHandleStyles={isSelected ? cornerHandles : undefined}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(el.id);
                      }}
                      onDragStop={(_e, d) => {
                        const x = Math.round(d.x);
                        const y = Math.round(d.y);
                        if (x !== el.x || y !== el.y) updateElement(el.id, { x, y });
                      }}
                      onResizeStop={(_e, _dir, ref, _delta, pos) =>
                        updateElement(el.id, {
                          width: Math.round(parseFloat(ref.style.width)),
                          height: Math.round(parseFloat(ref.style.height)),
                          x: Math.round(pos.x),
                          y: Math.round(pos.y),
                        })
                      }
                      className={cn(
                        "cursor-move",
                        !isSelected && "hover:outline-dashed hover:outline-primary/70"
                      )}
                      style={{
                        zIndex: el.zIndex,
                        outline: isSelected
                          ? `${2 / scale}px solid hsl(var(--primary))`
                          : undefined,
                        outlineWidth: isSelected ? undefined : 1 / scale,
                      }}
                    >
                      <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                        <TemplateElementView element={el} data={sampleData} />
                      </div>
                    </Rnd>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {mode === "edit"
            ? "Drag to move · drag the corners to resize · arrow keys nudge · Delete removes"
            : "Preview with sample student data"}
          {" · "}
          {width}×{height}px at {Math.round(scale * 100)}%
        </p>
      </div>

      {/* Properties */}
      <div className="order-3 min-w-0 rounded-xl border bg-white p-4 shadow-sm md:self-start">
        {!selected || !SelectedIcon ? (
          <div className="space-y-4 py-2 text-center">
            <MousePointerClick className="mx-auto h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Nothing selected</p>
              <p className="text-xs text-muted-foreground">
                Click anything on the card, or pick it from the Layers tab, to change it.
              </p>
            </div>
            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-left text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground">Shortcuts</p>
              <p>Arrow keys: nudge (Shift = 10px)</p>
              <p>Ctrl/⌘ + D: duplicate</p>
              <p>Ctrl/⌘ + Z: undo · Shift to redo</p>
              <p>Delete: remove · Esc: deselect</p>
              <p>Ctrl/⌘ + S: save template</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <SelectedIcon className="h-4 w-4 shrink-0 text-primary" />
                <p className="truncate text-sm font-semibold">{describeElement(selected)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Duplicate (Ctrl+D)"
                  onClick={() => duplicateElement(selected.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Delete"
                  onClick={() => deleteElement(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selected.type === "dynamic-field" && (
              <PanelSection title="Shows">
                <Select
                  value={selected.fieldKey || "fullName"}
                  onValueChange={(v) =>
                    updateElement(selected.id, { fieldKey: v as DynamicFieldKey })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 overflow-y-auto">
                    {Object.entries(DYNAMIC_FIELD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PanelSection>
            )}

            {selected.type === "text" && (() => {
              const parsed = parseTemplateTextContent(selected.content);
              const useSimple = parsed.mode === "label-and-field";

              return (
                <PanelSection title="Text">
                  {useSimple ? (
                    <>
                      <Label className="text-xs text-muted-foreground">
                        Label (type here, optional)
                      </Label>
                      <Input
                        placeholder='e.g. "Grade:" or "Name:"'
                        value={parsed.label}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            {
                              content: buildTemplateTextContent(
                                e.target.value,
                                parsed.fieldKey
                              ),
                            },
                            `content-label-${selected.id}`
                          )
                        }
                        className="h-9"
                      />
                      <Label className="text-xs text-muted-foreground">
                        Data field (dropdown)
                      </Label>
                      <Select
                        value={parsed.fieldKey || "none"}
                        onValueChange={(v) =>
                          updateElement(selected.id, {
                            content: buildTemplateTextContent(
                              parsed.label,
                              v === "none" ? "" : (v as DynamicFieldKey)
                            ),
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose field" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80 overflow-y-auto">
                          <SelectItem value="none">
                            Label only (no student data)
                          </SelectItem>
                          {Object.entries(DYNAMIC_FIELD_LABELS).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Use a dropdown for student data. Type only the label
                        text (e.g. &quot;Section:&quot;). For names, pick{" "}
                        <span className="font-medium">Full Name</span> or add a
                        separate <span className="font-medium">Field</span>{" "}
                        block from the left panel.
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          const base = buildTemplateTextContent(
                            parsed.label,
                            parsed.fieldKey
                          );
                          updateElement(selected.id, {
                            content: base ? `${base} ` : " ",
                          });
                        }}
                      >
                        Switch to custom text
                      </Button>
                    </>
                  ) : (
                    <>
                      <Label className="text-xs text-muted-foreground">
                        Custom text
                      </Label>
                      <Input
                        value={parsed.customText}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            { content: e.target.value },
                            `content-${selected.id}`
                          )
                        }
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Advanced: you can still use {"{fieldKey}"} tokens. Prefer
                        label + dropdown above for simpler layouts.
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          updateElement(selected.id, {
                            content: buildTemplateTextContent("", "fullName"),
                          })
                        }
                      >
                        Use label + dropdown instead
                      </Button>
                    </>
                  )}
                </PanelSection>
              );
            })()}

            {isTextual && (
              <PanelSection title="Style">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateStyle(
                        selected,
                        { fontSize: Math.max(6, (selected.style?.fontSize || 14) - 1) },
                        `font-${selected.id}`
                      )
                    }
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    value={selected.style?.fontSize || 14}
                    onChange={(e) => {
                      const next = parseInt(e.target.value);
                      if (!Number.isNaN(next)) {
                        updateStyle(selected, { fontSize: clamp(next, 6, 200) }, `font-${selected.id}`);
                      }
                    }}
                    className="h-8 w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateStyle(
                        selected,
                        { fontSize: Math.min(200, (selected.style?.fontSize || 14) + 1) },
                        `font-${selected.id}`
                      )
                    }
                  >
                    +
                  </Button>
                  <span className="text-[11px] text-muted-foreground">px</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <ToggleButton
                    title="Bold"
                    active={selected.style?.fontWeight === "bold"}
                    onClick={() =>
                      updateStyle(selected, {
                        fontWeight: selected.style?.fontWeight === "bold" ? "normal" : "bold",
                      })
                    }
                  >
                    <Bold className="h-4 w-4" />
                  </ToggleButton>
                  <ToggleButton
                    title="All caps"
                    active={selected.style?.textTransform === "uppercase"}
                    onClick={() =>
                      updateStyle(selected, {
                        textTransform:
                          selected.style?.textTransform === "uppercase" ? "none" : "uppercase",
                      })
                    }
                  >
                    <CaseUpper className="h-4 w-4" />
                  </ToggleButton>
                  <span className="mx-1 w-px bg-border" />
                  {(
                    [
                      { value: "left", icon: AlignLeft, title: "Align left" },
                      { value: "center", icon: AlignCenter, title: "Align center" },
                      { value: "right", icon: AlignRight, title: "Align right" },
                    ] as const
                  ).map((option) => (
                    <ToggleButton
                      key={option.value}
                      title={option.title}
                      active={(selected.style?.textAlign || "left") === option.value}
                      onClick={() => updateStyle(selected, { textAlign: option.value })}
                    >
                      <option.icon className="h-4 w-4" />
                    </ToggleButton>
                  ))}
                </div>
                <ColorField
                  label="Text color"
                  value={selected.style?.color}
                  onChange={(v) => updateStyle(selected, { color: v }, `color-${selected.id}`)}
                />
              </PanelSection>
            )}

            <PanelSection title="Fill & border">
              <ColorField
                label="Fill color"
                value={selected.style?.backgroundColor}
                onChange={(v) => updateStyle(selected, { backgroundColor: v }, `fill-${selected.id}`)}
                onClear={() => updateStyle(selected, { backgroundColor: undefined })}
              />
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Border"
                  value={selected.style?.borderWidth || 0}
                  min={0}
                  max={40}
                  onChange={(v) =>
                    updateStyle(selected, { borderWidth: clamp(v, 0, 40) }, `border-${selected.id}`)
                  }
                />
                <NumberField
                  label="Rounded corners"
                  value={selected.style?.borderRadius || 0}
                  min={0}
                  max={500}
                  onChange={(v) =>
                    updateStyle(selected, { borderRadius: clamp(v, 0, 500) }, `radius-${selected.id}`)
                  }
                />
              </div>
              {(selected.style?.borderWidth || 0) > 0 && (
                <ColorField
                  label="Border color"
                  value={selected.style?.borderColor || "#cccccc"}
                  onChange={(v) =>
                    updateStyle(selected, { borderColor: v }, `border-color-${selected.id}`)
                  }
                />
              )}
            </PanelSection>

            <PanelSection title="Position & size">
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="X"
                  value={selected.x}
                  onChange={(v) =>
                    updateElement(selected.id, { x: clamp(v, 0, width - selected.width) }, `x-${selected.id}`)
                  }
                />
                <NumberField
                  label="Y"
                  value={selected.y}
                  onChange={(v) =>
                    updateElement(selected.id, { y: clamp(v, 0, height - selected.height) }, `y-${selected.id}`)
                  }
                />
                <NumberField
                  label="Width"
                  value={selected.width}
                  onChange={(v) =>
                    updateElement(selected.id, { width: clamp(v, 10, width - selected.x) }, `w-${selected.id}`)
                  }
                />
                <NumberField
                  label="Height"
                  value={selected.height}
                  onChange={(v) =>
                    updateElement(selected.id, { height: clamp(v, 10, height - selected.y) }, `h-${selected.id}`)
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    updateElement(selected.id, { x: Math.round((width - selected.width) / 2) })
                  }
                >
                  <AlignCenterVertical className="h-3.5 w-3.5" />
                  Center ↔
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    updateElement(selected.id, { y: Math.round((height - selected.height) / 2) })
                  }
                >
                  <AlignCenterHorizontal className="h-3.5 w-3.5" />
                  Center ↕
                </Button>
              </div>
            </PanelSection>

            <PanelSection title="Layer">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => moveLayer(selected.id, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Forward
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => moveLayer(selected.id, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Backward
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => setToolTab("layers")}
              >
                <Layers className="h-3.5 w-3.5" />
                Show all layers
              </Button>
            </PanelSection>
          </div>
        )}
      </div>
    </div>
  );
}
