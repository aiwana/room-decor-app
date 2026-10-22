import { useState, useEffect, useCallback } from "react";
import { designApi } from "@/services/design-api";
import type { Design } from "@/types";

export function useDesigns() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await designApi.getAll();
      setDesigns(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { designs, loading, error, refresh: fetch };
}
