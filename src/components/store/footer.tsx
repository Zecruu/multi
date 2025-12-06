import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";

const quickLinks = [
  { name: "Home", href: "/store" },
  { name: "Services", href: "/store/products" },
  { name: "About", href: "/store/about" },
  { name: "Products", href: "/store/products" },
  { name: "My Account", href: "/store/account" },
];

export function StoreFooter() {
  return (
    <footer className="bg-background border-t border-border/40">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/store" className="flex items-center gap-3 mb-2">
              <Image
                src="/logo.jpg"
                alt="Multi Electric Supply"
                width={36}
                height={36}
                className="rounded"
              />
              <span className="text-lg font-semibold text-amber-500">Multi Electric Supply</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              All rights reserved.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-amber-500 font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <span>Av. 65 de Infantería km 7.4</span>
                  <br />
                  <span>Carolina, PR 00923</span>
                  <br />
                  <Link href="https://maps.google.com" className="text-primary hover:underline text-xs">
                    View on Google Maps
                  </Link>
                </div>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>+1 (787) 963-0569</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>hzayas@multielectricpr.com</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-cyan-400 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/40">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Multi Electric Supply. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
