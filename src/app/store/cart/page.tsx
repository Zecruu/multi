"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart-context";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

export default function CartPage() {
  const { items, itemCount, subtotal, tax, taxRate, total, updateQuantity, removeItem, clearCart } = useCart();
  const { language } = useLanguage();

  const t = {
    emptyCart: language === "es" ? "Tu Carrito está Vacío" : "Your Cart is Empty",
    emptyCartDesc: language === "es" ? "Parece que aún no has agregado ningún artículo a tu carrito." : "Looks like you haven't added any items to your cart yet.",
    continueShopping: language === "es" ? "Continuar Comprando" : "Continue Shopping",
    shoppingCart: language === "es" ? "Carrito de Compras" : "Shopping Cart",
    cartItems: language === "es" ? "Artículos del Carrito" : "Cart Items",
    clearCart: language === "es" ? "Vaciar Carrito" : "Clear Cart",
    remove: language === "es" ? "Eliminar" : "Remove",
    subtotalLabel: language === "es" ? "Subtotal" : "Subtotal",
    orderSummary: language === "es" ? "Resumen del Pedido" : "Order Summary",
    shipping: language === "es" ? "Envío" : "Shipping",
    free: language === "es" ? "GRATIS" : "FREE",
    addMoreForFreeShipping: language === "es" ? "Agrega ${amount} más para envío gratis" : "Add ${amount} more for free shipping",
    salesTax: language === "es" ? "Impuesto PR" : "PR Sales Tax",
    total: language === "es" ? "Total" : "Total",
    proceedToCheckout: language === "es" ? "Proceder al Pago" : "Proceed to Checkout",
    secureCheckout: language === "es" ? "Pago seguro con Stripe" : "Secure checkout powered by Stripe",
    cartCleared: language === "es" ? "Carrito vaciado" : "Cart cleared",
    itemRemoved: language === "es" ? "Artículo eliminado del carrito" : "Item removed from cart",
  };

  const shipping = subtotal >= 99 ? 0 : 9.99;
  const grandTotal = total + shipping;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto text-center p-8">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.emptyCart}</h1>
          <p className="text-muted-foreground mb-6">
            {t.emptyCartDesc}
          </p>
          <Link href="/store/products">
            <Button className="gap-2">
              {t.continueShopping}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.shoppingCart}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t.cartItems} ({itemCount})</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  clearCart();
                  toast.success(t.cartCleared);
                }}
              >
                {t.clearCart}
              </Button>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((item) => (
                <div key={item.productId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/store/products/${item.productId}`}
                        className="font-medium hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      <p className="font-semibold mt-1">${item.price.toFixed(2)}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0) {
                              updateQuantity(item.productId, value);
                            }
                          }}
                          className="w-12 h-8 text-center border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8"
                        onClick={() => {
                          removeItem(item.productId);
                          toast.success(t.itemRemoved);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t.remove}
                      </Button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="flex justify-end mt-2">
                    <p className="text-sm text-muted-foreground">
                      Subtotal: <span className="font-semibold text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Continue Shopping */}
          <div className="flex justify-start">
            <Link href="/store/products">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t.continueShopping}
              </Button>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>{t.orderSummary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.subtotalLabel}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.shipping}</span>
                <span>{shipping === 0 ? t.free : `$${shipping.toFixed(2)}`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-muted-foreground">
                  {language === "es" 
                    ? `Agrega $${(99 - subtotal).toFixed(2)} más para envío gratis`
                    : `Add $${(99 - subtotal).toFixed(2)} more for free shipping`}
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t.salesTax} ({(taxRate * 100).toFixed(1)}%)
                </span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>{t.total}</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Link href="/store/checkout" className="w-full">
                <Button className="w-full" size="lg">
                  {t.proceedToCheckout}
                </Button>
              </Link>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t.secureCheckout}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
