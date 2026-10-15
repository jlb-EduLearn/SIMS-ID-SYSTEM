"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { expandTemplateTextPlaceholders } from "@/lib/template-text-content";
import {
  type TemplateDesign,
  type TemplateElement,
  type StudentPrintData,
  resolveDynamicField,
  DYNAMIC_FIELD_LABELS,
} from "@/types/template";

interface IdCardRendererProps {
  design: TemplateDesign;
  data: StudentPrintData;
  width: number;
  height: number;
  scale?: number;
  className?: string;
}

function resolveTextContent(
  element: TemplateElement,
  data: StudentPrintData
): string {
  if (element.type === "dynamic-field" && element.fieldKey) {
    return resolveDynamicField(element.fieldKey, data);
  }
  if (element.content) {
    return expandTemplateTextPlaceholders(element.content, (key) =>
      resolveDynamicField(key, data)
    );
  }
  return "";
}

function ElementRenderer({
  element,
  data,
  inline = false,
}: {
  element: TemplateElement;
  data: StudentPrintData;
  inline?: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const style = element.style || {};

  useEffect(() => {
    if (element.type === "qr-code") {
      QRCode.toDataURL(data.studentId, {
        width: element.width,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrDataUrl);
    }
  }, [element.type, element.width, data.studentId]);

  const baseStyle: React.CSSProperties = {
    position: inline ? "relative" : "absolute",
    left: inline ? undefined : element.x,
    top: inline ? undefined : element.y,
    width: inline ? "100%" : element.width,
    height: inline ? "100%" : element.height,
    zIndex: inline ? undefined : element.zIndex,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily || "Arial, sans-serif",
    fontWeight: style.fontWeight as React.CSSProperties["fontWeight"],
    fontStyle: style.fontStyle as React.CSSProperties["fontStyle"],
    textAlign: style.textAlign,
    color: style.color,
    backgroundColor: style.backgroundColor,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    borderStyle: style.borderWidth ? "solid" : undefined,
    borderRadius: style.borderRadius,
    opacity: style.opacity,
    textTransform: style.textTransform,
    overflow: "hidden",
    display: "flex",
    alignItems:
      style.textAlign === "center"
        ? "center"
        : style.textAlign === "right"
          ? "flex-end"
          : "flex-start",
    justifyContent:
      style.textAlign === "center"
        ? "center"
        : style.textAlign === "right"
          ? "flex-end"
          : "flex-start",
  };

  switch (element.type) {
    case "signature":
      return (
        <div style={baseStyle}>
          {data.signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.signatureUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "#64748b",
              }}
            >
              No Signature
            </div>
          )}
        </div>
      );

    case "photo":
      return (
        <div style={baseStyle}>
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.photoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: style.objectFit || "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              No Photo
            </div>
          )}
        </div>
      );

    case "logo":
      return (
        <div style={baseStyle}>
          {data.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.schoolLogoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: style.objectFit || "contain",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#94a3b8",
              }}
            >
              LOGO
            </div>
          )}
        </div>
      );

    case "qr-code":
      return (
        <div style={baseStyle}>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR" style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      );

    case "barcode":
      return (
        <div
          style={{
            ...baseStyle,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "90%",
              height: "60%",
              background:
                "repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 8px)",
            }}
          />
          <span style={{ fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>
            {data.studentId}
          </span>
        </div>
      );

    case "image":
      return (
        <div style={baseStyle}>
          {element.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={element.imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: style.objectFit || "contain",
              }}
            />
          )}
        </div>
      );

    case "shape":
      return <div style={baseStyle} />;

    case "dynamic-field":
    case "text":
    default:
      return (
        <div style={{ ...baseStyle, lineHeight: 1.2, padding: "2px 4px" }}>
          {element.type === "dynamic-field" && element.fieldKey
            ? resolveDynamicField(element.fieldKey, data)
            : resolveTextContent(element, data)}
        </div>
      );
  }
}

export function TemplateElementView({
  element,
  data,
}: {
  element: TemplateElement;
  data: StudentPrintData;
}) {
  return <ElementRenderer element={element} data={data} inline />;
}

export function IdCardRenderer({
  design,
  data,
  width,
  height,
  scale = 1,
  className,
}: IdCardRendererProps) {
  const sortedElements = [...design.elements].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  return (
    <div
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        position: "relative",
        overflow: "hidden",
        backgroundColor: design.backgroundColor || "#ffffff",
        backgroundImage: design.backgroundImage
          ? `url(${design.backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {sortedElements.map((el) => (
          <ElementRenderer key={el.id} element={el} data={data} />
        ))}
      </div>
    </div>
  );
}

export function getSamplePrintData(): StudentPrintData {
  return {
    id: "sample",
    studentId: "2024-0001",
    firstName: "Juan",
    lastName: "Dela Cruz",
    middleName: "Santos",
    fullName: "Juan Santos Dela Cruz",
    grade: "Grade 10",
    section: "Section A",
    dateOfBirth: "2008-05-15",
    gender: "Male",
    address: "123 Main St, City",
    contactPhone: "+63 912 345 6789",
    email: "juan@example.com",
    photoUrl: null,
    recordType: "Student",
    department: "Academic Department",
    position: "Student",
    emergencyFullName: "Maria Santos",
    emergencyFirstName: "Maria",
    emergencyMiddleName: "",
    emergencyLastName: "Santos",
    emergencyAddress: "456 Parent St, City",
    emergencyPhone: "+63 917 555 1234",
    schoolName: "Sample High School",
    schoolCode: "SHS-001",
    schoolLogoUrl: null,
  };
}

export { DYNAMIC_FIELD_LABELS };
