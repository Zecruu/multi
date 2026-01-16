"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface WishlistItem {
  productId: {
    _id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    images: { url: string; key: string; isPrimary: boolean }[];
    category: string;
    quantity: number;
    status: string;
  };
  addedAt: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (status !== "authenticated") {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/wishlist");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some((item) => item.productId?._id === productId);
    },
    [items]
  );

  const addToWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (status !== "authenticated") {
        return false;
      }

      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (response.ok) {
          await fetchWishlist();
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to add to wishlist:", error);
        return false;
      }
    },
    [status, fetchWishlist]
  );

  const removeFromWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (status !== "authenticated") {
        return false;
      }

      try {
        const response = await fetch(`/api/wishlist?productId=${productId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setItems((prev) => prev.filter((item) => item.productId?._id !== productId));
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to remove from wishlist:", error);
        return false;
      }
    },
    [status]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
