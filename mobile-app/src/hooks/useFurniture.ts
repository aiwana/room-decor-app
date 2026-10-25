import { useState, useEffect, useCallback } from "react";
import { furnitureApi } from "@/services/furniture-api";
import type { Furniture } from "@/types";

export function useFurniture(category?: string) {
  const [items, setItems] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await furnitureApi.getAll(category);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refresh: fetch };
}
