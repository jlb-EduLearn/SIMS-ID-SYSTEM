import {
  DYNAMIC_FIELD_LABELS,
  type DynamicFieldKey,
} from "@/types/template";

const FIELD_KEYS = Object.keys(DYNAMIC_FIELD_LABELS) as DynamicFieldKey[];

/** e.g. "Grade: {grade}" → label + field; "{fullName}" → field only */
export function parseTemplateTextContent(content: string | undefined): {
  mode: "label-and-field" | "custom";
  label: string;
  fieldKey: DynamicFieldKey | "";
  customText: string;
} {
  const raw = content ?? "";
  const trimmed = raw.trim();

  if (!trimmed) {
    return { mode: "label-and-field", label: "", fieldKey: "", customText: "" };
  }

  const single = trimmed.match(/^(.*?)\{([a-zA-Z]+)\}$/);
  if (single) {
    const key = single[2];
    if (FIELD_KEYS.includes(key as DynamicFieldKey)) {
      return {
        mode: "label-and-field",
        label: single[1],
        fieldKey: key as DynamicFieldKey,
        customText: raw,
      };
    }
  }

  const onlyToken = trimmed.match(/^\{([a-zA-Z]+)\}$/);
  if (onlyToken && FIELD_KEYS.includes(onlyToken[1] as DynamicFieldKey)) {
    return {
      mode: "label-and-field",
      label: "",
      fieldKey: onlyToken[1] as DynamicFieldKey,
      customText: raw,
    };
  }

  return {
    mode: "custom",
    label: "",
    fieldKey: "",
    customText: raw,
  };
}

export function buildTemplateTextContent(
  label: string,
  fieldKey: DynamicFieldKey | ""
): string {
  if (!fieldKey) return label;
  return `${label}{${fieldKey}}`;
}

export function expandTemplateTextPlaceholders(
  content: string,
  resolve: (key: DynamicFieldKey) => string
): string {
  return content.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => {
    if (FIELD_KEYS.includes(key as DynamicFieldKey)) {
      return resolve(key as DynamicFieldKey);
    }
    return match;
  });
}
