import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Opt-In Policy | MultiElectric Supply",
  description:
    "MultiElectric Supply SMS messaging program, opt-in, opt-out, and privacy terms.",
  robots: { index: true, follow: true },
};

export default function SmsPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          SMS Opt-In Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Política de Mensajes de Texto · Last updated: April 2026
        </p>
      </div>

      <section className="space-y-8 text-sm md:text-base leading-relaxed">
        {/* ── English ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">English</h2>

          <div>
            <h3 className="font-semibold mb-1">Program Description</h3>
            <p>
              By providing your mobile phone number to MultiElectric Supply
              staff at our physical store in Puerto Rico and consenting to
              receive messages, you agree to receive SMS messages from
              MultiElectric Supply related to your recent visit, including
              customer experience surveys, review requests, and occasional
              promotional offers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">How to Opt In</h3>
            <p>
              Opt-in occurs in person at our physical store. A staff member
              will ask whether you would like to receive a single SMS review
              request after your visit. You must give verbal consent and
              provide your mobile number for staff to manually enter it into
              our system. We do <strong>not</strong> enroll customers
              automatically based on online purchases, website activity, or
              third-party data.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Message Frequency</h3>
            <p>
              Up to one (1) SMS message per visit, with a maximum of two (2)
              messages per customer per month.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">How to Opt Out</h3>
            <p>
              You may stop receiving messages at any time by replying{" "}
              <strong>STOP</strong> (or <strong>BAJA</strong>,{" "}
              <strong>CANCELAR</strong>, or <strong>UNSUBSCRIBE</strong>) to
              any message. You will receive a confirmation and no further
              messages from us.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Help</h3>
            <p>
              Reply <strong>HELP</strong> or <strong>AYUDA</strong> to any
              message, or contact us at{" "}
              <a
                href="tel:7879630569"
                className="text-primary hover:underline"
              >
                (787) 963-0569
              </a>
              .
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Message &amp; Data Rates</h3>
            <p>
              Message and data rates may apply. Consult your mobile carrier for
              details. MultiElectric Supply does not charge for messages.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Privacy</h3>
            <p>
              We will never sell, rent, or share your mobile phone number with
              third parties for marketing purposes. The only information
              collected through the SMS program is your phone number, your
              first name, and your replies to our messages. This data is used
              solely to fulfill the purpose of the program (collecting feedback
              and, for satisfied customers, inviting a public review).
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Supported Carriers</h3>
            <p>
              Messages are supported on all major U.S. and Puerto Rico
              carriers, including AT&amp;T, T-Mobile, Verizon, Claro, Liberty,
              and others. Carriers are not liable for delayed or undelivered
              messages.
            </p>
          </div>
        </div>

        {/* ── Spanish ─────────────────────────────────────────────── */}
        <div className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-semibold text-foreground">Español</h2>

          <div>
            <h3 className="font-semibold mb-1">Descripción del Programa</h3>
            <p>
              Al proporcionar su número de celular al personal de MultiElectric
              Supply en nuestra tienda física en Puerto Rico y dar su
              consentimiento para recibir mensajes, usted acepta recibir
              mensajes SMS de MultiElectric Supply relacionados con su visita
              reciente, incluyendo encuestas de experiencia, solicitudes de
              reseña y ofertas promocionales ocasionales.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Cómo Suscribirse</h3>
            <p>
              La suscripción ocurre en persona en nuestra tienda física. Un
              empleado le preguntará si desea recibir un mensaje SMS después
              de su visita. Usted debe dar su consentimiento verbal y
              proporcionar su número celular para que el empleado lo ingrese
              manualmente en nuestro sistema.{" "}
              <strong>No inscribimos</strong> automáticamente a clientes
              basándonos en compras en línea, actividad del sitio web ni datos
              de terceros.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Frecuencia de Mensajes</h3>
            <p>
              Hasta un (1) mensaje SMS por visita, con un máximo de dos (2)
              mensajes por cliente por mes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Cómo Cancelar</h3>
            <p>
              Puede dejar de recibir mensajes en cualquier momento respondiendo{" "}
              <strong>STOP</strong>, <strong>BAJA</strong>,{" "}
              <strong>CANCELAR</strong> o <strong>UNSUBSCRIBE</strong> a
              cualquier mensaje. Recibirá una confirmación y no le enviaremos
              más mensajes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Ayuda</h3>
            <p>
              Responda <strong>AYUDA</strong> o <strong>HELP</strong> a
              cualquier mensaje, o llámenos al{" "}
              <a
                href="tel:7879630569"
                className="text-primary hover:underline"
              >
                (787) 963-0569
              </a>
              .
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Costos</h3>
            <p>
              Pueden aplicar cargos de mensajes y datos de su proveedor
              celular. MultiElectric Supply no cobra por los mensajes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Privacidad</h3>
            <p>
              Nunca venderemos, alquilaremos ni compartiremos su número de
              celular con terceros con fines de mercadeo. La única información
              recopilada a través de este programa es su número de celular, su
              nombre, y sus respuestas a nuestros mensajes. Estos datos se
              utilizan únicamente para los fines del programa (recopilar
              opiniones y, si está satisfecho, invitarle a dejar una reseña
              pública).
            </p>
          </div>
        </div>

        <div className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            <strong>MultiElectric Supply</strong> ·{" "}
            <a href="tel:7879630569" className="hover:underline">
              (787) 963-0569
            </a>{" "}
            · Puerto Rico
          </p>
          <p className="mt-1">
            SMS delivery powered by Nexulon LLC on behalf of MultiElectric
            Supply.
          </p>
        </div>
      </section>
    </div>
  );
}
