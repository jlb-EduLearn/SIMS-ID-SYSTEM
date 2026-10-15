"use client";

import { useEffect, useState } from "react";
import { getSamplePrintData } from "@/components/id-card/id-card-renderer";
import type { StudentPrintData } from "@/types/template";

export function useSchoolSampleData(): StudentPrintData {
  const [data, setData] = useState<StudentPrintData>(getSamplePrintData);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/school-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (cancelled || !result?.school) return;
        setData((current) => ({
          ...current,
          schoolName: result.school.name,
          schoolCode: result.school.code,
          schoolLogoUrl: result.school.logoUrl,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
