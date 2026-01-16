"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (translations: { en: string; es: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Common translations for UI elements
export const translations = {
  // Navigation
  home: { en: "Home", es: "Inicio" },
  products: { en: "Products", es: "Productos" },
  cart: { en: "Cart", es: "Carrito" },
  search: { en: "Search products...", es: "Buscar productos..." },
  
  // User menu
  myAccount: { en: "My Account", es: "Mi Cuenta" },
  orders: { en: "Orders", es: "Pedidos" },
  wishlist: { en: "Wishlist", es: "Lista de Deseos" },
  settings: { en: "Settings", es: "Configuración" },
  signIn: { en: "Sign In", es: "Iniciar Sesión" },
  signOut: { en: "Sign Out", es: "Cerrar Sesión" },
  createAccount: { en: "Create Account", es: "Crear Cuenta" },
  
  // Product page
  addToCart: { en: "Add to Cart", es: "Agregar al Carrito" },
  outOfStock: { en: "Out of Stock", es: "Agotado" },
  inStock: { en: "In Stock", es: "En Stock" },
  lowStock: { en: "Low Stock", es: "Pocas Unidades" },
  description: { en: "Description", es: "Descripción" },
  specifications: { en: "Specifications", es: "Especificaciones" },
  quantity: { en: "Quantity", es: "Cantidad" },
  price: { en: "Price", es: "Precio" },
  sku: { en: "SKU", es: "SKU" },
  category: { en: "Category", es: "Categoría" },
  brand: { en: "Brand", es: "Marca" },
  
  // Checkout
  checkout: { en: "Checkout", es: "Pagar" },
  subtotal: { en: "Subtotal", es: "Subtotal" },
  shipping: { en: "Shipping", es: "Envío" },
  tax: { en: "Tax", es: "Impuesto" },
  total: { en: "Total", es: "Total" },
  freeShipping: { en: "FREE", es: "GRATIS" },
  proceedToPayment: { en: "Proceed to Payment", es: "Proceder al Pago" },
  
  // Forms
  fullName: { en: "Full Name", es: "Nombre Completo" },
  email: { en: "Email", es: "Correo Electrónico" },
  phone: { en: "Phone Number", es: "Número de Teléfono" },
  address: { en: "Street Address", es: "Dirección" },
  city: { en: "City", es: "Ciudad" },
  state: { en: "State", es: "Estado" },
  zipCode: { en: "ZIP Code", es: "Código Postal" },
  country: { en: "Country", es: "País" },
  
  // Contact & Shipping
  contactInfo: { en: "Contact Information", es: "Información de Contacto" },
  shippingAddress: { en: "Shipping Address", es: "Dirección de Envío" },
  orderSummary: { en: "Order Summary", es: "Resumen del Pedido" },
  
  // Messages
  emptyCart: { en: "Your Cart is Empty", es: "Tu Carrito está Vacío" },
  addItemsBeforeCheckout: { en: "Add some items to your cart before checking out.", es: "Agrega algunos productos a tu carrito antes de pagar." },
  browseProducts: { en: "Browse Products", es: "Ver Productos" },
  orderConfirmed: { en: "Order Confirmed!", es: "¡Pedido Confirmado!" },
  thankYouOrder: { en: "Thank you for your order.", es: "Gracias por tu pedido." },
  
  // Filters
  allCategories: { en: "All Categories", es: "Todas las Categorías" },
  sortBy: { en: "Sort by", es: "Ordenar por" },
  newest: { en: "Newest", es: "Más Reciente" },
  priceLowHigh: { en: "Price: Low to High", es: "Precio: Menor a Mayor" },
  priceHighLow: { en: "Price: High to Low", es: "Precio: Mayor a Menor" },
  nameAZ: { en: "Name: A-Z", es: "Nombre: A-Z" },
  
  // Footer
  aboutUs: { en: "About Us", es: "Sobre Nosotros" },
  contactUs: { en: "Contact Us", es: "Contáctanos" },
  privacyPolicy: { en: "Privacy Policy", es: "Política de Privacidad" },
  termsOfService: { en: "Terms of Service", es: "Términos de Servicio" },
  
  // Language
  language: { en: "Language", es: "Idioma" },
  english: { en: "English", es: "Inglés" },
  spanish: { en: "Spanish", es: "Español" },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es"); // Spanish as default
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "es")) {
      setLanguageState(savedLanguage);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (trans: { en: string; es: string }): string => {
    return trans[language] || trans.en;
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "es", setLanguage, t }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

